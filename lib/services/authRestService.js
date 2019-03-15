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

const request = require('request');
const { logger } = require('../core');
const debug = require('debug')('ripple-fhir-service:services:resource-rest');

function requestAsync(options) {
  return new Promise((resolve, reject) => {
    request(options, (err, response, body) => {
      if (err) return reject(err);

      debug('body: %j', body);

      return resolve(body);
    });
  });
}

/**
 * Fhir API Auth REST service
 */
class AuthRestService {
  constructor(ctx, hostConfig) {
    this.ctx = ctx;
    this.hostConfig = hostConfig;
  }

  static create(ctx) {

    return new AuthRestService(ctx, ctx.serversConfig);
  }

  /**
   * Sends a request to get token
   *
   * @return {Promise.<Object>}
   */
  async authenticate() {
    logger.info('services/authRestService|authenticate');

    const options = {
      url: `${this.hostConfig.auth.host + this.hostConfig.auth.path}`,
      method: 'POST',
      form: {
        grant_type: this.hostConfig.auth.grant_type
      },
      headers: {
        'authorization': `Basic ${ new Buffer(this.hostConfig.auth.client_id + ':' + this.hostConfig.auth.client_secret).toString('base64') }`
      },
      json: true
    };

    debug('options: %j', options);

    return requestAsync(options);
  }
}

module.exports = AuthRestService;
