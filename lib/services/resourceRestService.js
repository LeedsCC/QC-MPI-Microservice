/*

 ----------------------------------------------------------------------------
 |                                                                          |
 | http://www.synanetics.com                                                |
 | Email: support@synanetics.com                                            |
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

  20 Mar 2020

*/

'use strict';

const { logger } = require('../core');
const request = require('request');
const debug = require('debug')('ripple-fhir-service:services:resource-rest');
const fileLogger = require('../../logger').logger;
const https = require('https');

function parseJsonFormatter(result) {
  let jsonResult;

  try {
    jsonResult = JSON.parse(result);
  } catch (err) {
    jsonResult = {};
  }

  return jsonResult;
}

function checkErrorResponse(response) {
  if (response.statusCode >= 500) {
    try {
      const body1 = JSON.parse(response.body);

      return {
        status: response.statusCode,
        message: body1
      };
    } catch (e) {
      return {
        status: response.statusCode,
        message: response.body
      };
    }
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

function requestAsync(args, { formatter } = {}) {

  return new Promise((resolve, reject) => {
    request(args, (err, response, body) => {

      debug('body: %s', body);

      if (err) {
        fileLogger.error('', err);
        return reject(err);
      }

      const errorResult = checkErrorResponse(response);

      if (errorResult) {
        fileLogger.error('', errorResult);
        return reject(errorResult);
      }

      if (response.statusCode !== 200 && response.statusCode !== 201) {
        return reject(body);
      }

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
    return new ResourceRestService(ctx, ctx.globalConfig.api);
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
      url: `${this.hostConfig.host}/${ reference }`,
      method: 'GET',
      json: false,
      headers: {
        'authorization': `Bearer ${token}`,
        'accept': 'application/fhir+json; charset=UTF-8'
      }
    };

    if (this.hostConfig.proxy) {
      args.proxy = this.hostConfig.proxy;
    }

    if (this.hostConfig.env !== 'local') {
      args.agent = new https.Agent({
        host: this.hostConfig.agentHost,
        port: this.hostConfig.agentPort,
        passphrase: this.hostConfig.passphrase,
        rejectUnauthorized: true,
        cert: this.hostConfig.certFile,
        key: this.hostConfig.privateKey,
        ca: this.hostConfig.caFile 
      });
    } else {
      args.rejectUnauthorized = false;
    }

    debug('args: %j', args);

    const result = await requestAsync(args);

    return result === ''
      ? {}
      : parseJsonFormatter(result);
  }

  /**
   * Sends a request to post referenced resource
   *
   * @param  {string} reference
   * @param  {string} token
   * @return {Promise.<Object>}
   */
  async postResource(resourceType, resource, token) {
    logger.info('services/resourceRestService|postResource', { resourceType, token: typeof token });

    debug('token: %s', token);

    const args = {
      url: `${this.hostConfig.host}/${ resourceType }`,
      method: 'POST',
      json: true,
      body: resource,
      headers: {
        'Content-Type': 'application/fhir+json; charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'accept': 'application/fhir+json; charset=UTF-8'
      }
    };

    if (this.hostConfig.proxy) {
      args.proxy = this.hostConfig.proxy;
    }

    if (this.hostConfig.env !== 'local') {
      args.agent = new https.Agent({
        host: this.hostConfig.agentHost,
        port: this.hostConfig.agentPort,
        passphrase: this.hostConfig.passphrase,
        rejectUnauthorized: true,
        cert: this.hostConfig.certFile,
        key: this.hostConfig.privateKey,
        ca: this.hostConfig.caFile 
      });
    } else {
      args.rejectUnauthorized = false;
    }

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
      url: `${this.hostConfig.host}/${ resourceType }?${ query }`,
      method: 'GET',
      json: false,
      headers: {
        'authorization': `Bearer ${token}`,
        'accept': 'application/fhir+json; charset=UTF-8'
      }
    };

    if (this.hostConfig.proxy) {
      args.proxy = this.hostConfig.proxy;
    }

    if (this.hostConfig.env !== 'local') {
      args.agent = new https.Agent({
        host: this.hostConfig.agentHost,
        port: this.hostConfig.agentPort,
        passphrase: this.hostConfig.passphrase,
        rejectUnauthorized: true,
        cert: this.hostConfig.certFile,
        key: this.hostConfig.privateKey,
        ca: this.hostConfig.caFile 
      });
    } else {
      args.rejectUnauthorized = false;
    }

    debug('args: %j', args);

    const result = await requestAsync(args);

    return result === ''
      ? {}
      : parseJsonFormatter(result);
  }
}

module.exports = ResourceRestService;
