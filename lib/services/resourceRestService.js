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
const request = require('request');
const debug = require('debug')('ripple-fhir-service:services:resource-rest');

function parseJsonFormatter(result) {
  let jsonResult;

  try {
    jsonResult = JSON.parse(result);
  } catch (err) {
    jsonResult = {};
  }

  return jsonResult;
}

function requestAsync(args, { formatter } = {}) {

  return new Promise((resolve, reject) => {
    request(args, (err, response, body) => {

      if (err) return reject(err);

      debug('body: %s', body);

      if (formatter) {
        return resolve(formatter(body));
      }

      return resolve(body);
    });
  });
}

/**
 * Fhir API REST service
 */
class ResourceRestService {
  constructor(ctx, hostConfig) {
    this.ctx = ctx;
    this.hostConfig = hostConfig;
  }

  static create(ctx) {
    return new ResourceRestService(ctx, ctx.serversConfig);
  }

  /**
   * Sends a request to get referenced resource
   * Response is single FHIR resource
   *
   * @param  {string} reference
   * @param  {string} token
   * @return {Promise.<Object>}
   */
  async getResource(reference, token) {
    logger.info('services/resourceRestService|getResource', { reference, token: typeof token });

    debug('token: %s', token);

    const args = {
      url: `${this.hostConfig.api.host}/${ reference }`,
      method: 'GET',
      json: false,
      headers: {
        'authorization': `Bearer ${token}`,
        'accept': 'application/fhir+json; charset=UTF-8'
      }
    };

    debug('args: %j', args);

    const result = await requestAsync(args);

    return result === ''
      ? {}
      : parseJsonFormatter(result);
  }

  /**
   * Sends a request to get referenced resources
   * FHIR response is Bundle
   *
   * @param  {string} resourceType
   * @param  {string} query
   * @param  {string} token
   * @return {Promise.<Object>}
   */
  async getResources(resourceType, query, token) {
    logger.info('services/resourceRestService|getResources', { resourceType, query, token: typeof token });

    debug('token: %s', token);

    const args = {
      url: `${this.hostConfig.api.host}/${ resourceType }?${ query }`,
      method: 'GET',
      json: false,
      headers: {
        'authorization': `Bearer ${token}`,
        'accept': 'application/fhir+json; charset=UTF-8'
      }
    };

    debug('args: %j', args);

    const result = await requestAsync(args);

    return result === ''
      ? {}
      : parseJsonFormatter(result);
  }
}

module.exports = ResourceRestService;
