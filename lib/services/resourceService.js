/*

 ----------------------------------------------------------------------------
 | ripple-fhir-service: Ripple FHIR Interface                               |
 |                                                                          |
 | Copyright (c) 2017-19 Ripple Foundation Community Interest Company       |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://rippleosi.org                                                     |
 | Email: code.custodian@rippleosi.org                                      |
 |                                                                          |
 | Author: Rob Tweed, M/Gateway Developments Ltd                            |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  14 March 2019

*/

'use strict';

const P = require('bluebird');
const { logger } = require('../core');
const { ResourceName } = require('../shared/enums');
const { getPractitionerRef, parseRef, mapQuery } = require('../shared/utils');
const debug = require('debug')('ripple-fhir-service:services:resource');

class ResourceService {
  constructor(ctx) {
    this.ctx = ctx;
  }

  static create(ctx) {
    return new ResourceService(ctx);
  }

  /**
   * Fetch patients
   *
   * @param {int|string} nhsNumber
   * @returns {Promise}
   */
  async fetchPatients(nhsNumber) {
    logger.info('services/resourceService|fetchPatients', { nhsNumber });

    const { patientCache } = this.ctx.cache;

    const exists = patientCache.byNhsNumber.exists(nhsNumber);
    debug('exists: %s', exists);

    if (exists) {
      return {
        ok: false,
        exists: true
      };
    }

    const fetchResult = await this.fetchResources(ResourceName.PATIENT, { nhsNumber });
    debug('fetchResult: %j', fetchResult);

    const data = fetchResult.resource;

    if (!data || !data.entry) {
      return {
        ok: false,
        entry: false
      };
    }

    const result = {
      ok: true,
      totalCount: data.entry.length,
      processedCount: 0
    };

    data.entry.forEach((x) => {
      const patient = x.resource;
      const patientUuid = patient.id;

      if (!patientUuid) return;

      const exists = patientCache.byPatientUuid.exists(patientUuid);
      if (exists) return;

      patientCache.byPatientUuid.set(patientUuid, patient);
      //@TODO check if we really need it.
      patientCache.byPatientUuid.setNhsNumber(patientUuid, nhsNumber);
      patientCache.byNhsNumber.setPatientUuid(nhsNumber, patientUuid);

      result.processedCount++;
    });

    return result;
  }

  /**
   * Fetch a resource practioner
   *
   * @param  {string} resourceName
   * @param  {string} reference
   * @return {Promise}
   */
  async fetchPatientPractitioner(nhsNumber) {
    logger.info('services/resourceService|fetchPatientPractitioner', { nhsNumber });

    const { patientCache, resourceCache } = this.ctx.cache;

    const patientUuid = patientCache.byNhsNumber.getPatientUuid(nhsNumber);
    const patient = patientCache.byPatientUuid.get(patientUuid);

    if (!patient) {
      throw Error(`Patient ${ nhsNumber } was not found.`);
    }

    const practitionerReference = getPractitionerRef(patient);

    if (!practitionerReference) return;

    // resource will be null if either:
    // - the practitioner is already cached; or
    // - the practioner is already in the process of being fetched in an earlier iteration
    try {

      const { resource } = await this.fetchResource(practitionerReference);

      if (resource) {
        resourceCache.byUuid.setRelatedUuid(ResourceName.PATIENT, patient.id, ResourceName.ORGANIZATION, resource.id);
      }

      debug('resource: %j', resource);
    } catch (e) {
      logger.error('services/resourceService|fetchPatientPractitioner|err', e);
      return;
    }
  }

  /**
   * Fetch a resource
   *
   * @param  {string} reference
   * @return {Promise.<Object>}
   */
  async fetchResource(reference) {
    logger.info('services/resourceService|fetchResource', { reference });

    const { resourceName, uuid } = parseRef(reference);
    const { fetchCache, resourceCache } = this.ctx.cache;

    const exists  = resourceCache.byUuid.exists(resourceName, uuid);
    if (exists) {
      return {
        ok: false,
        exists: true
      };
    }

    const fetching = fetchCache.exists(reference);
    if (fetching) {
      return {
        ok: false,
        fetching: true
      };
    }

    const { authRestService, resourceRestService } = this.ctx.services;

    const adminResource = ['Policy', 'Consent', 'Patient'].includes(resourceName);

    const rsn = adminResource ? '5' : '2';

    const rol = adminResource ? '4' : null;

    const token = (await authRestService.authenticate(rsn, rol)).access_token;

    fetchCache.set(reference);
    const resource = await resourceRestService.getResource(reference, token);

    debug('resource: %j', resource);

    resourceCache.byUuid.set(resourceName, uuid, resource);

    return {
      ok: true,
      resource
    };
  }

  /**
   * Fetch resources
   *
   * @param  {string} resourceType
   * @param  {Object} queryParams
   * @return {Promise.<Object>}
   */
  async fetchResources(resourceType, queryParams, noCache = false) {
    logger.info('services/resourceService|fetchResources', { queryParams });

    const { searchConfig } = this.ctx;

    const query = mapQuery(resourceType, queryParams, searchConfig);

    const { fetchCache, resourceCache } = this.ctx.cache;

    if (!noCache) {

      const exists  = resourceCache.byQuery.exists(resourceType, query);
      if (exists) {
        return {
          ok: false,
          exists: true
        };
      }

      const fetching = fetchCache.exists(query);
      if (fetching) {
        return {
          ok: false,
          fetching: true
        };
      }

      fetchCache.set(query);
    }

    const { authRestService, resourceRestService } = this.ctx.services;

    const adminResource = ['Policy', 'Consent', 'Patient'].includes(resourceType);

    const rsn = adminResource ? '5' : '2';

    const rol = adminResource ? '4' : null;

    const token = (await authRestService.authenticate(rsn, rol)).access_token;

    const resource = await resourceRestService.getResources(resourceType, query, token);

    debug('resource: %j', resource);

    if (!noCache) {
      resourceCache.byQuery.set(resourceType, query, resource);
    }

    return {
      ok: true,
      resource
    };
  }

  async postResource(resourceType, resource) {

    logger.info('services/resourceService|fetchResources', { resourceType });

    const { authRestService, resourceRestService } = this.ctx.services;

    const adminResource = ['Policy', 'Consent', 'Patient'].includes(resourceType);

    const rsn = adminResource ? '5' : '2';

    const rol = adminResource ? '4' : null;

    const token = (await authRestService.authenticate(rsn, rol)).access_token;

    await resourceRestService.postResource(resourceType, resource, token);

    return {
      ok: true
    };
  }
}

module.exports = ResourceService;
