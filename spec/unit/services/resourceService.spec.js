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
 | Licensed under the Apache License, Version 2.0 (the 'License');          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an 'AS IS' BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  14 March 2019

*/

'use strict';

const { ExecutionContextMock } = require('@tests/mocks');
const ResourceService = require('@lib/services/resourceService');

describe('ripple-cdr-lib/lib/services/resourceService', () => {
  let ctx;
  let resourceService;

  let tokenService;
  let resourceRestService;

  let patientCache;
  let resourceCache;
  let fetchCache;

  beforeEach(() => {
    ctx = new ExecutionContextMock();
    resourceService = new ResourceService(ctx);

    patientCache = ctx.cache.patientCache;
    resourceCache = ctx.cache.resourceCache;
    fetchCache = ctx.cache.fetchCache;

    tokenService = ctx.services.tokenService;
    resourceRestService = ctx.services.resourceRestService;

    tokenService.get.and.resolveValue('foo.bar.baz');

    ctx.cache.freeze();
    ctx.services.freeze();
  });

  describe('#create (static)', () => {
    it('should initialize a new instance', async () => {
      const actual = ResourceService.create(ctx);

      expect(actual).toEqual(jasmine.any(ResourceService));
      expect(actual.ctx).toBe(ctx);
    });
  });

  describe('#fetchPatients', () => {
    let nhsNumber;

    beforeEach(() => {
      nhsNumber = 9999999000;
    });

    it('should return non ok when patients exists', async () => {
      const expected = {
        ok: false,
        exists: true
      };

      patientCache.byNhsNumber.exists.and.returnValue(true);

      const actual = await resourceService.fetchPatients(nhsNumber);

      expect(patientCache.byNhsNumber.exists).toHaveBeenCalledWith(9999999000);
      expect(actual).toEqual(expected);
    });

    it('should return non ok when no data entry', async () => {
      const expected = {
        ok: false,
        entry: false
      };

      const data = {};

      patientCache.byNhsNumber.exists.and.returnValue(false);
      resourceRestService.getResources.and.resolveValue(data);

      const actual = await resourceService.fetchPatients(nhsNumber);

      expect(patientCache.byNhsNumber.exists).toHaveBeenCalledWith(9999999000);
      expect(tokenService.get).toHaveBeenCalled();
      expect(resourceRestService.getResources).toHaveBeenCalledWith('Patient', 'identifier=9999999000', 'foo.bar.baz');

      expect(actual).toEqual(expected);
    });

    it('should fetch and do not cache existing patients', async () => {
      const expected = {
        ok: true,
        totalCount: 1,
        processedCount: 0
      };

      const data = {
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'e22f0105-279d-4871-bde2-9e18684d69ec'
            }
          }
        ]
      };

      patientCache.byNhsNumber.exists.and.returnValue(false);
      resourceRestService.getResources.and.resolveValue(data);
      resourceCache.byQuery.exists.and.returnValue(false);
      fetchCache.exists.and.returnValue(false);
      patientCache.byPatientUuid.exists.and.returnValue(true);

      const actual = await resourceService.fetchPatients(nhsNumber);

      expect(patientCache.byNhsNumber.exists).toHaveBeenCalledWith(9999999000);
      expect(tokenService.get).toHaveBeenCalled();
      expect(resourceRestService.getResources).toHaveBeenCalledWith('Patient', 'identifier=9999999000', 'foo.bar.baz');
      expect(patientCache.byPatientUuid.exists).toHaveBeenCalledWith('e22f0105-279d-4871-bde2-9e18684d69ec');

      expect(actual).toEqual(expected);
    });

    it('should fetch and cache patients', async () => {
      const expected = {
        ok: true,
        totalCount: 1,
        processedCount: 1
      };

      const data = {
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'e22f0105-279d-4871-bde2-9e18684d69ec'
            }
          }
        ]
      };

      patientCache.byNhsNumber.exists.and.returnValue(false);
      resourceRestService.getResources.and.resolveValue(data);
      resourceCache.byQuery.exists.and.returnValue(false);
      fetchCache.exists.and.returnValue(false);
      patientCache.byPatientUuid.exists.and.returnValue(false);

      const actual = await resourceService.fetchPatients(nhsNumber);

      expect(patientCache.byNhsNumber.exists).toHaveBeenCalledWith(9999999000);
      expect(tokenService.get).toHaveBeenCalled();
      expect(resourceRestService.getResources).toHaveBeenCalledWith('Patient', 'identifier=9999999000', 'foo.bar.baz');
      expect(patientCache.byPatientUuid.exists).toHaveBeenCalledWith('e22f0105-279d-4871-bde2-9e18684d69ec');

      expect(patientCache.byPatientUuid.set).toHaveBeenCalledWith(
        'e22f0105-279d-4871-bde2-9e18684d69ec', {
          resourceType: 'Patient',
          id: 'e22f0105-279d-4871-bde2-9e18684d69ec'
        });
      expect(patientCache.byNhsNumber.setPatientUuid).toHaveBeenCalledWith(9999999000, 'e22f0105-279d-4871-bde2-9e18684d69ec');

      expect(actual).toEqual(expected);
    });
  });

  describe('#fetchPatientPractitioner', () => {
    let nhsNumber;

    beforeEach(() => {
      nhsNumber = 8888888888;
    });

    it('should fetch practitioner', async () => {
      
      patientCache.byNhsNumber.getPatientUuid.and.returnValue('e22f0105-279d-4871-bde2-9e18684d69ec');
      patientCache.byPatientUuid.get.and.returnValue({
        resourceType: 'Patient',
        id: 'e22f0105-279d-4871-bde2-9e18684d69ec',
        generalPractitioner: [
          {
            reference: 'Practitioner/f08a49e4-8bf4-4beb-9837-dc26fe78111e'
          }
        ]
      });
      
      spyOn(resourceService, 'fetchResource').and.resolveValue({
        resource: {
          id: 'f08a49e4-8bf4-4beb-9837-dc26fe78111e',
          resourceType: 'Practitioner'
        }
      });

      spyOn(resourceService, 'fetchResources').and.resolveValue({
        resource: {
          entry: [{
            resource: {
              id: 'f08a49e4-8bf4-4beb-9837-dc26fe78111e',
              resourceType: 'PractitionerRole',
              organization: { 
                reference: 'Organization/f34c12b1-749e-4c26-9621-a986d67ecd44'
              }
            }
          }]
        }
      });

      await resourceService.fetchPatientPractitioner(nhsNumber);

      expect(resourceService.fetchResource).toHaveBeenCalledTimes(2);
      expect(resourceService.fetchResource).toHaveBeenCalledWith('Practitioner/f08a49e4-8bf4-4beb-9837-dc26fe78111e');
      expect(resourceService.fetchResources).toHaveBeenCalledWith('PractitionerRole', { practitionerReference: 'Practitioner/f08a49e4-8bf4-4beb-9837-dc26fe78111e' });
      expect(resourceService.fetchResource).toHaveBeenCalledWith('Organization/f34c12b1-749e-4c26-9621-a986d67ecd44');
    });
  });

  describe('#fetchResource', () => {
    let reference;

    beforeEach(() => {
      reference = 'Immunization/f08a49e4-8bf4-4beb-9837-dc26fe78111e';
    });

    it('should return non-ok when resource exists', async () => {
      const expected = {
        ok: false,
        exists: true
      };

      resourceCache.byUuid.exists.and.returnValue(true);

      const actual = await resourceService.fetchResource(reference);

      expect(resourceCache.byUuid.exists).toHaveBeenCalledWith('Immunization', 'f08a49e4-8bf4-4beb-9837-dc26fe78111e');
      expect(actual).toEqual(expected);
    });

    it('should return non-ok when resource fetching', async () => {
      const expected = {
        ok: false,
        fetching: true
      };

      resourceCache.byUuid.exists.and.returnValue(false);
      fetchCache.exists.and.returnValue(true);

      const actual = await resourceService.fetchResource(reference);

      expect(resourceCache.byUuid.exists).toHaveBeenCalledWith('Immunization', 'f08a49e4-8bf4-4beb-9837-dc26fe78111e');
      expect(fetchCache.exists).toHaveBeenCalledWith('Immunization/f08a49e4-8bf4-4beb-9837-dc26fe78111e');

      expect(actual).toEqual(expected);
    });

    it('should fetch and cache ressource', async () => {
      const expected = {
        ok: true,
        resource: {
          id: 'f08a49e4-8bf4-4beb-9837-dc26fe78111e',
          foo: 'bar'
        }
      };

      resourceCache.byUuid.exists.and.returnValue(false);
      fetchCache.exists.and.returnValue(false);
      resourceRestService.getResource.and.resolveValue({
        id: 'f08a49e4-8bf4-4beb-9837-dc26fe78111e',
        foo: 'bar'
      });

      const actual = await resourceService.fetchResource(reference);

      expect(resourceCache.byUuid.exists).toHaveBeenCalledWith('Immunization', 'f08a49e4-8bf4-4beb-9837-dc26fe78111e');
      expect(fetchCache.exists).toHaveBeenCalledWith('Immunization/f08a49e4-8bf4-4beb-9837-dc26fe78111e');
      expect(tokenService.get).toHaveBeenCalled();
      expect(resourceRestService.getResource).toHaveBeenCalledWith('Immunization/f08a49e4-8bf4-4beb-9837-dc26fe78111e', 'foo.bar.baz');
      expect(resourceCache.byUuid.set).toHaveBeenCalledWith('Immunization', 'f08a49e4-8bf4-4beb-9837-dc26fe78111e', {
        id: 'f08a49e4-8bf4-4beb-9837-dc26fe78111e',
        foo: 'bar'
      });

      expect(actual).toEqual(expected);
    });
  });
});
