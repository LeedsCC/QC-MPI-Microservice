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
 | Author: Richard Brown                                                    |
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
const AuthGrantProvider = require('../providers/authGrantProvider');
const fileLogger = require('../../logger').logger;
const https = require('https');

function checkErrorResponse(response) {
  if (response.statusCode >= 500) {
    return {
      status: response.statusCode,
      message: response.body
    };
  }

  if (response.statusCode === 400) {
    try {
      const body = JSON.parse(response.body);

      if (body.resourceType === 'OperationOutcome') {
        return {
          status: 500,
          message: body
        };
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}

function requestAsync(options) {
  return new Promise((resolve, reject) => {
    request(options, (err, response, body) => {
    
      debug('body: %j', body);

      if (err) {
        fileLogger.error('', err);
        return reject(err);
      }

      const errorResult = checkErrorResponse(response);

      if (errorResult) {
        fileLogger.error('', errorResult);
        return reject(errorResult);
      }

      if (response.statusCode === 403) return reject(body);

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
    this.authProvider = AuthGrantProvider.create(ctx, hostConfig);
  }

  static create(ctx) {

    return new AuthRestService(ctx, ctx.globalConfig.auth);
  }

  /**
   * Sends a request to get token
   *
   * @return {Promise.<Object>}
   */
  async authenticate(rsn, rol) {
    logger.info('services/authRestService|authenticate');

    let options = {
      url: `${this.hostConfig.host + this.hostConfig.path}`,
      method: 'POST',
      headers: {
        'authorization': `Basic ${ Buffer.from(this.hostConfig.client_id + ':' + this.hostConfig.client_secret).toString('base64') }`
      },
      json: true
    };

    if (this.hostConfig.proxy) {
      options.proxy = this.hostConfig.proxy;
    }

    if (this.hostConfig.env !== 'local') {
      options.agent = new https.Agent({
        host: this.hostConfig.agentHost,
        port: this.hostConfig.agentPort,
        passphrase: this.hostConfig.passphrase,
        rejectUnauthorized: true,
        cert: this.hostConfig.certFile,
        key: this.hostConfig.privateKey,
        ca: this.hostConfig.caFile 
      });
    } else {
      options.rejectUnauthorized = false;
    }

    options = this.authProvider.applyAuthenticationScheme(options, rsn, rol);

    debug('options: %j', options);

    return requestAsync(options);
  }
}

module.exports = AuthRestService;
