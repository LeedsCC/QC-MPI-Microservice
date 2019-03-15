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
const DemographicService = require('@lib/services/demographicService');

describe('ripple-cdr-lib/lib/services/demographicService', () => {
  let ctx;
  let nhsNumber;

  let demographicService;

  let demographicCache;
  let resourceCache;
  let patientCache;

  beforeEach(() => {
    ctx = new ExecutionContextMock();
    nhsNumber = 9999999000;

    demographicService = new DemographicService(ctx);

    demographicCache = ctx.cache.demographicCache;
    resourceCache = ctx.cache.resourceCache;
    patientCache = ctx.cache.patientCache;

    ctx.cache.freeze();
    ctx.services.freeze();
  });

  describe('#create (static)', () => {
    it('should initialize a new instance', () => {
      const actual = DemographicService.create(ctx);

      expect(actual).toEqual(jasmine.any(DemographicService));
      expect(actual.ctx).toBe(ctx);
    });
  });

  describe('#getByPatientId', () => {
    it('should return demographics', () => {

      patientCache.byNhsNumber.exists.and.returnValue(true);
      patientCache.byPatientUuid.existsPractitionerUuid.and.returnValue(true);
      patientCache.byNhsNumber.getPatientUuid.and.returnValue('7bb44952-60dd-4ce8-9bbd-f0b56c80a260');
      patientCache.byPatientUuid.get.and.returnValue({
        name: [
          { text: 'John Doe' }
        ],
        gender: 'male',
        telecom : [{
          system: 'phone',
          use: 'home',
          period: {
            start: '1990-01-01T12:00:00Z'
          },
          value: '+44 58584 5475477'
        }],
        birthDate: '1990-01-01T12:00:00Z',
        address: []
      });
      patientCache.byPatientUuid.getPractitionerUuid.and.returnValue('3f2a728b-eda5-4c16-b67d-afeacaacbb1c');
      resourceCache.byUuid.existsRelatedUuid.and.returnValue(true);
      resourceCache.byUuid.getRelatedUuid.and.returnValue('1a30d00b-7fe5-44d5-bf18-9909e6fdacd2');
      resourceCache.byUuid.get.and.returnValues({
        name: {
          text: 'Jane Doe'
        }
      },
      {
        resourceType: 'Organization',
        id: '1a30d00b-7fe5-44d5-bf18-9909e6fdacd2',
        address: []
      });

      const expected = {
        demographics: {
          id: 9999999000,
          nhsNumber: 9999999000,
          gender: 'male',
          telephone: '+44 58584 5475477',
          name: 'John Doe',
          dateOfBirth: 631195200000,
          gpName: 'Jane Doe',
          gpAddress: 'Not known',
          address: 'Not known'
        }
      };

      const actual = demographicService.getByPatientId(nhsNumber);

      expect(patientCache.byNhsNumber.getPatientUuid).toHaveBeenCalledWith(9999999000);
      expect(patientCache.byPatientUuid.get).toHaveBeenCalledWith('7bb44952-60dd-4ce8-9bbd-f0b56c80a260');
      expect(patientCache.byPatientUuid.getPractitionerUuid).toHaveBeenCalledWith('7bb44952-60dd-4ce8-9bbd-f0b56c80a260');
      expect(resourceCache.byUuid.get).toHaveBeenCalledWith('Practitioner', '3f2a728b-eda5-4c16-b67d-afeacaacbb1c');
      expect(resourceCache.byUuid.getRelatedUuid).toHaveBeenCalledWith('Practitioner', '3f2a728b-eda5-4c16-b67d-afeacaacbb1c', 'Organization');
      expect(resourceCache.byUuid.get).toHaveBeenCalledWith('Organization', '1a30d00b-7fe5-44d5-bf18-9909e6fdacd2');

      expect(demographicCache.byNhsNumber.set).toHaveBeenCalledWith(9999999000, {
        demographics: {
          id: 9999999000,
          nhsNumber: 9999999000,
          gender: 'male',
          telephone: '+44 58584 5475477',
          name: 'John Doe',
          dateOfBirth: 631195200000,
          gpName: 'Jane Doe',
          gpAddress: 'Not known',
          address: 'Not known'
        }
      });

      expect(actual).toEqual(expected);
    });

    it('should throw error if patient uuid is not found', () => {
      
      patientCache.byNhsNumber.exists.and.returnValue(false);
      
      expect(() => demographicService.getByPatientId(8888888888)).toThrow(new Error('Patient not found.'));
    });

    it('should throw error if patient is not found', () => {
      
      patientCache.byNhsNumber.exists.and.returnValue(true);
      patientCache.byNhsNumber.getPatientUuid.and.returnValue(null);
      
      expect(() => demographicService.getByPatientId(8888888888)).toThrow(new Error('Patient not found.'));
    });

    it('should return patient without practitioner', () => {
      
      patientCache.byNhsNumber.exists.and.returnValue(true);

      patientCache.byPatientUuid.existsPractitionerUuid.and.returnValue(false);
      patientCache.byNhsNumber.getPatientUuid.and.returnValue('7bb44952-60dd-4ce8-9bbd-f0b56c80a260');
      patientCache.byPatientUuid.get.and.returnValue({
        name: [
          { text: 'John Doe' }
        ],
        gender: 'male',
        telecom : [{
          system: 'phone',
          use: 'home',
          period: {
            start: '1990-01-01T12:00:00Z'
          },
          value: '+44 58584 5475477'
        }],
        birthDate: '1990-01-01T12:00:00Z',
        address: []
      });

      resourceCache.byUuid.existsRelatedUuid.and.returnValue(false);

      const expected = {
        demographics: {
          id: 9999999000,
          nhsNumber: 9999999000,
          gender: 'male',
          telephone: '+44 58584 5475477',
          name: 'John Doe',
          dateOfBirth: 631195200000,
          gpName: 'Not known',
          gpAddress: 'Not known',
          address: 'Not known'
        }
      };

      const actual = demographicService.getByPatientId(nhsNumber);

      expect(demographicCache.byNhsNumber.set).toHaveBeenCalledWith(9999999000, {
        demographics: {
          id: 9999999000,
          nhsNumber: 9999999000,
          gender: 'male',
          telephone: '+44 58584 5475477',
          name: 'John Doe',
          dateOfBirth: 631195200000,
          gpName: 'Not known',
          gpAddress: 'Not known',
          address: 'Not known'
        }
      });

      expect(actual).toEqual(expected);
    });

    it('should return patient and practitioner without organisation', () => {
      
      patientCache.byNhsNumber.exists.and.returnValue(true);

      patientCache.byPatientUuid.existsPractitionerUuid.and.returnValue(true);
      patientCache.byNhsNumber.getPatientUuid.and.returnValue('7bb44952-60dd-4ce8-9bbd-f0b56c80a260');
      patientCache.byPatientUuid.get.and.returnValue({
        name: [
          { text: 'John Doe' }
        ],
        gender: 'male',
        telecom : [{
          system: 'phone',
          use: 'home',
          period: {
            start: '1990-01-01T12:00:00Z'
          },
          value: '+44 58584 5475477'
        }],
        birthDate: '1990-01-01T12:00:00Z',
        address: []
      });

      patientCache.byPatientUuid.getPractitionerUuid.and.returnValue('3f2a728b-eda5-4c16-b67d-afeacaacbb1c');
      resourceCache.byUuid.existsRelatedUuid.and.returnValue(false);
      resourceCache.byUuid.get.and.returnValues({
        name: {
          text: 'Jane Doe'
        }
      });

      const expected = {
        demographics: {
          id: 9999999000,
          nhsNumber: 9999999000,
          gender: 'male',
          telephone: '+44 58584 5475477',
          name: 'John Doe',
          dateOfBirth: 631195200000,
          gpName: 'Jane Doe',
          gpAddress: 'Not known',
          address: 'Not known'
        }
      };

      const actual = demographicService.getByPatientId(nhsNumber);

      expect(demographicCache.byNhsNumber.set).toHaveBeenCalledWith(9999999000, {
        demographics: {
          id: 9999999000,
          nhsNumber: 9999999000,
          gender: 'male',
          telephone: '+44 58584 5475477',
          name: 'John Doe',
          dateOfBirth: 631195200000,
          gpName: 'Jane Doe',
          gpAddress: 'Not known',
          address: 'Not known'
        }
      });

      expect(actual).toEqual(expected);
    });
  });

});
