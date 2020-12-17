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

  17 April 2019

*/

'use strict';

const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid/v4');


/**
 * Fhir Jwt Bearer Grant Provider
 */
class JwtBearerGrantProvider {

  constructor(ctx, hostConfig) {
    this.ctx = ctx;
    this.hostConfig = hostConfig;
  }

  /**
   * Applies client credentials authentication scheme
   * 
   * @param {Object} options 
   * 
   * @return {Object}
   */
  applyAuthenticationScheme(options, rsn, rol) {
    return this.applyOptionsForJwtBearerGrant(options, rsn, rol);
  }

  /**
   * Generates options for jwt bearer grant_type
   * @param {Object} session
   * @param {String} jwtId
   * @param {Date} issuedAt
   * 
   * @return {Object}
   */
  applyOptionsForJwtBearerGrant(options, rsn, rol) {

    const { session } = this.ctx;

    return Object.assign(options, {
      form: {
        grant_type: this.hostConfig.grant_type,
        assertion: this.getAssertion(session.nhsNumber, rsn, rol)
      }
    });
  }

  /**
     * @private
     * @returns {string}
     */
  getAssertion(nhsNumber, rsn, setRol) {
    const { scope, ods, aud, iss, azp } = this.hostConfig.assertion;

    let { usr } = this.hostConfig.assertion;

    if (setRol) {
      usr = { rol: setRol, org: ods };
    }

    const { env } = this.hostConfig;

    const iat = Math.floor(new Date().getTime() / 1000);
    const exp = iat + 3600;

    const jwtAssertion = {
      iss,
      scope,
      aud,
      ods,
      usr,
      sub: iss,
      rsn,
      exp,
      iat,
      azp,
      jti: uuidv4(),
    };

    if (nhsNumber && rsn !== '5') {
      jwtAssertion.pat = { nhs: `${nhsNumber}` };
    }

    if (env === 'local') {
      return JSON.stringify(jwtAssertion);
    } else {
      const signed = jwt.sign(jwtAssertion, { key: this.hostConfig.signingPrivateKey, passphrase: this.hostConfig.signingPassphrase }, {
        algorithm: 'RS256',
      });

      return signed;
    }
  }
}

module.exports = JwtBearerGrantProvider;