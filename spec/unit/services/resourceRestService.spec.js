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
const ResourceRestService = require('@lib/services/resourceRestService');
const nock = require('nock');

describe('ripple-cdr-lib/lib/services/resourceRestService', () => {
  let ctx;
  let token;

  let hostConfig;
  let resourceRestService;

  beforeEach(() => {
    ctx = new ExecutionContextMock();

    token = 'testToken';

    hostConfig = {
      api: {
        host: 'https://10.153.7.80:444/FHIRService',
      }
    };

    resourceRestService = new ResourceRestService(ctx, hostConfig);
  });

  describe('#create (static)', () => {
    it('should initialize a new instance', async () => {
      const actual = ResourceRestService.create(ctx);

      expect(actual).toEqual(jasmine.any(ResourceRestService));
      expect(actual.ctx).toBe(ctx);
      expect(actual.hostConfig).toBe(ctx.serversConfig);
    });
  });

  describe('#getResource', () => {
    it('should send request and return resource', async () => {
      const expected = {
        resourceType: 'Immunization',
        id: '48f8c9e3-7bae-4418-b896-2423957f3c33'
      };

      const data = {
        resourceType: 'Immunization',
        id: '48f8c9e3-7bae-4418-b896-2423957f3c33'
      };

      nock('https://10.153.7.80:444/FHIRService')
        .get('/Immunization/48f8c9e3-7bae-4418-b896-2423957f3c33')
        .matchHeader('authorization', 'Bearer testToken')
        .reply(200, JSON.stringify(data));

      const reference = 'Immunization/48f8c9e3-7bae-4418-b896-2423957f3c33';
      const actual = await resourceRestService.getResource(reference, token);

      expect(actual).toEqual(expected);
      expect(nock).toHaveBeenDone();
    });

    it('should send request and return empty object', async () => {
      const expected = {};

      nock('https://10.153.7.80:444/FHIRService')
        .get('/Immunization/48f8c9e3-7bae-4418-b896-2423957f3c33')
        .matchHeader('authorization', 'Bearer testToken')
        .reply(200, '');

      const reference = 'Immunization/48f8c9e3-7bae-4418-b896-2423957f3c33';
      const actual = await resourceRestService.getResource(reference, token);

      expect(actual).toEqual(expected);
      expect(nock).toHaveBeenDone();
    });

    it('should throw error', async () => {
      const expected = {
        message: 'custom error',
        code: 500
      };

      nock('https://10.153.7.80:444/FHIRService')
        .get('/Immunization/48f8c9e3-7bae-4418-b896-2423957f3c33')
        .matchHeader('authorization', 'Bearer testToken')
        .replyWithError({
          message: 'custom error',
          code: 500
        });

      const reference = 'Immunization/48f8c9e3-7bae-4418-b896-2423957f3c33';
      const actual = resourceRestService.getResource(reference, token);

      await expectAsync(actual).toBeRejectedWith(expected);
      expect(nock).toHaveBeenDone();
    });
  });

  describe('#getResources', () => {
    it('should send request and return bundle', async () => {
      
      const expected = {
        entry: [{
          resource: {
            resourceType: 'Immunization',
            id: '48f8c9e3-7bae-4418-b896-2423957f3c33'
          }
        }]
      };

      const data = {
        entry: [{
          resource: {
            resourceType: 'Immunization',
            id: '48f8c9e3-7bae-4418-b896-2423957f3c33'
          }
        }]
      };

      nock('https://10.153.7.80:444/FHIRService')
        .get('/Immunization?identifier=test')
        .matchHeader('authorization', 'Bearer testToken')
        .reply(200, JSON.stringify(data));

      const actual = await resourceRestService.getResources('Immunization', 'identifier=test', token);

      expect(actual).toEqual(expected);
      expect(nock).toHaveBeenDone();
    });

    it('should send request and return empty object', async () => {
      const expected = {
        entry: []
      };

      const data = {
        entry: []
      };

      nock('https://10.153.7.80:444/FHIRService')
        .get('/Immunization?identifier=test')
        .matchHeader('authorization', 'Bearer testToken')
        .reply(200, JSON.stringify(data));

      const actual = await resourceRestService.getResources('Immunization', 'identifier=test', token);

      expect(actual).toEqual(expected);
      expect(nock).toHaveBeenDone();
    });

    it('should throw error', async () => {

      const expected = {
        message: 'custom error',
        code: 500
      };
  
      nock('https://10.153.7.80:444/FHIRService')
        .get('/Immunization?identifier=test')
        .matchHeader('authorization', 'Bearer testToken')
        .replyWithError({
          message: 'custom error',
          code: 500
        });
  
      const actual = resourceRestService.getResources('Immunization', 'identifier=test', token);

      await expectAsync(actual).toBeRejectedWith(expected);
      expect(nock).toHaveBeenDone();
    });
  });
});
