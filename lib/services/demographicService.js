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

const { logger } = require('../core');
const { ResourceName } = require('../shared/enums');
const { parseName, parseAddress, parseTelecom } = require('../shared/utils');
const debug = require('debug')('ripple-fhir-service:services:demographic');

class DemographicService {
  constructor(ctx) {
    this.ctx = ctx;
  }

  static create(ctx) {
    return new DemographicService(ctx);
  }

  /**
   * Gets demographic data by NHS number
   *
   * @param  {int|string} nhsNumber
   * @return {Object}
   */
  getByPatientId(nhsNumber) {
    logger.info('services/demographicService|getByPatientId', { nhsNumber });

    const { patientCache, resourceCache, demographicCache } = this.ctx.cache;

    let patientUuid;
    let patient = null;

    if (patientCache.byNhsNumber.exists(nhsNumber)) {
      patientUuid = patientCache.byNhsNumber.getPatientUuid(nhsNumber);
      patient = patientCache.byPatientUuid.get(patientUuid);
    }

    if (!patient) {
      throw Error('Patient not found.');
    }

    let practitionerUuid = null;
    let practitioner = {};
    let practitionerOrganisation = {};
    
    if (patientCache.byPatientUuid.existsPractitionerUuid(patientUuid)) {
      practitionerUuid = patientCache.byPatientUuid.getPractitionerUuid(patientUuid);
      practitioner = resourceCache.byUuid.get(ResourceName.PRACTITIONER, practitionerUuid);
    }
    
    const practiionerOrgExists = practitionerUuid 
      && resourceCache.byUuid.existsRelatedUuid(ResourceName.PRACTITIONER, practitionerUuid, ResourceName.ORGANIZATION);

    if (practiionerOrgExists) {
      const practitionerOrganisationUuid = resourceCache.byUuid.getRelatedUuid(ResourceName.PRACTITIONER, practitionerUuid, ResourceName.ORGANIZATION);
      practitionerOrganisation = resourceCache.byUuid.get(ResourceName.ORGANIZATION, practitionerOrganisationUuid);
    }

    const demographics = {};

    demographics.id = nhsNumber;
    demographics.nhsNumber = nhsNumber;
    demographics.gender = patient.gender;
    demographics.telephone = parseTelecom(patient.telecom); 
    demographics.name = parseName(patient.name) || 'Not known';
    demographics.dateOfBirth = new Date(patient.birthDate).getTime();
    demographics.gpName = parseName(practitioner.name) || 'Not known';
    //@TODO should address be parsed too?
    demographics.gpAddress = parseAddress(practitionerOrganisation.address) || 'Not known';
    demographics.address = parseAddress(patient.address) || 'Not known';

    debug('demographics: %j', demographics);

    const resultObj = {
      demographics
    };

    //@TODO Talk regarding this functionality
    demographicCache.byNhsNumber.set(nhsNumber, resultObj);

    return resultObj;
  }
}

module.exports = DemographicService;
