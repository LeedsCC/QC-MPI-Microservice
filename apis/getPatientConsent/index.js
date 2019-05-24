/*

 ----------------------------------------------------------------------------
 |                                                                          |
 | Copyright (c) 2019 Ripple Foundation Community Interest Company          |
 | All rights reserved.                                                     |
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

  23 May 2019

*/

'use strict';

const { logger } = require('../../lib/core');
const { GetPatientConsentCommand } = require('../../lib/commands');
const { getResponseError } = require('../../lib/errors');

/**
 * @param  {Object} args
 * @param  {Function} finished
 */
module.exports = async function getPatientConsent (args, finished) {
  try {
    const command = new GetPatientConsentCommand(args.req.ctx, args.session);
    const responseObj = await command.execute(args.patientId);
    
    finished(responseObj);
  } catch (err) {
    
    logger.error('apis/getPatientConsent|err', err);

    const responseError = getResponseError(err);
    
    finished(responseError);
  }
};