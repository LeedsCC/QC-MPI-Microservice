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

const { logger } = require('../../../core');

module.exports = (adapter) => {
  return {

    /**
     * Checks if data resource by query exists
     *
     * @param  {string} resourceName
     * @param  {string} query
     * @return {bool}
     */
    exists: (resourceName, query) => {
      logger.info('mixins/resource|byQuery|exists', { resourceName, query });

      const key = ['Fhir', resourceName, 'by_query', query];

      return adapter.exists(key);
    },

    /**
     * Sets resource data
     *
     * @param  {string} resourceName
     * @param  {string} query
     * @param  {Object} resource
     * @return {void}
     */
    set: (resourceName, query, resource) => {
      logger.info('mixins/resource|byQuery|set', { resourceName, query, resource });

      const key = ['Fhir', resourceName, 'by_query', query];
      const dataKey = ['Fhir', resourceName, 'by_query', query, 'data'];

      if (!adapter.exists(key)) {
        adapter.putObject(dataKey, resource);
      }
    },

    /**
     * Gets resource data
     *
     * @param  {string} resourceName
     * @param  {string} query
     * @return {Object}
     */
    get: (resourceName, query) => {
      logger.info('mixins/resource|byQuery|get', { query });

      const key = ['Fhir', resourceName, 'by_query', query, 'data'];

      return adapter.getObjectWithArrays(key);
    }
  };
};