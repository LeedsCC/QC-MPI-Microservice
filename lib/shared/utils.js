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

const traverse = require('traverse');
const { ResourceName } = require('./enums');
const { isNumeric } = require('./validation');

function flatten(obj) {
  const flatObj = {};

  traverse(obj).map(function (node) {
    if (this.isLeaf) {
      let flatPath = '';
      let slash = '';
      let colon = '';

      const lastPathIndex = this.path.length - 1;
      const pathArr = this.path;

      pathArr.forEach(function (path, index) {
        if (isNumeric(path)) {
          flatPath = flatPath + colon + path;
        } else {
          if (index === lastPathIndex && path[0] === '|' && isNumeric(pathArr[index -1])) {
            slash = '';
          }
          flatPath = flatPath + slash + path;
        }

        slash = '/';
        colon = ':';
      });

      flatObj[flatPath] = node;
    }
  });

  return flatObj;
}

function getLocationRef(resource) {
  if (!resource.extension) return null;

  return resource.extension
    .filter(x => x.valueReference)
    .find(x => x.valueReference.reference).valueReference.reference;
}

function getPractitionerRef(resource) {

  let practitionerReference = null;

  if (resource.resourceType === ResourceName.PATIENT) {

    if (resource.generalPractitioner) {
      
      resource.generalPractitioner.forEach((practitionerItem) => {
        
        if (practitionerItem.reference.indexOf('Practitioner') > -1) {
          practitionerReference = practitionerItem.reference;
        }
      });
    }
  }

  return practitionerReference;
}

function getPatientUuid(resource) {
  return resource.resourceType === ResourceName.PATIENT
    ? resource.id
    : parseRef(resource.patient.reference).uuid;
}

function lazyLoadAdapter(target) {
  if (!target.initialise) {
    throw new Error('target must has initialise method defined.');
  }

  return new Proxy(target, {
    get: (obj, prop) => {
      if (typeof prop === 'symbol' || prop === 'inspect' || Reflect.has(obj, prop)) {
        return Reflect.get(obj, prop);
      }

      Reflect.set(obj, prop, obj.initialise(prop));

      return obj[prop];
    }
  });
}

function parseRef(reference, { separator = '/' } = {}) {
  const pieces = reference.split(separator);
  const resourceName = pieces[0];
  const uuid = pieces[1];

  return {
    resourceName,
    uuid
  };
}

//@TODO Re check functionality for correct spaces
function parseName(name) {

  let primaryName = null;

  if (Array.isArray(name) && name.length) {
    primaryName = name.find((nameItem) => nameItem.use === 'official') || name[0];
  }
  else {
    primaryName = name;
  }

  if (!primaryName) return null;

  let initName = primaryName && primaryName.text 
    ? primaryName.text
    : null;

  if (!initName) {
    if(primaryName.given) {
      initName = getName(primaryName.given);
    }

    if (primaryName.family) {
      initName = Array.isArray(primaryName.family)
        ? getName(primaryName.family)
        : `${initName} ${primaryName.family}`;
    }
  }

  return initName;
}

function getName(nameObj) {
  let name;

  Array.isArray(nameObj)
    ? nameObj.forEach(n => name = name ? `${name} ${n}` : `${n}`)
    : name = nameObj;

  return name;
}

function getOrganisationRef(resource) {
  
  let organisationRef = null;

  if (resource.resourceType === 'PractitionerRole' && resource.organization) {
    organisationRef = resource.organization.reference;
  }

  return organisationRef;
}

//@TODO package this piece of code
function parseAddress(addressArray) {

  if (!addressArray || !addressArray.length) {
    return null;
  }

  let mainAddress = addressArray.find((addr) => addr.use === 'home');

  if (!mainAddress) {
    mainAddress = addressArray[0];
  }

  if (mainAddress.text) {
    return mainAddress.text;
  }

  return null;

  // const addressComponents = []

  // if ()

  // if (pAddress && Array.isArray(pAddress)) {
  //   var addrObj = pAddress[0];
  //   if (addrObj.text) {
  //     address = addrObj.text;
  //   }
  //   else {
  //     if (addrObj.postalCode) {
  //       address = '';
  //       var dlim = '';
  //       if (addrObj.line) {
  //         if (Array.isArray(addrObj.line)) {
  //           addrObj.line.forEach(function(line) {
  //             address = address + dlim + line;
  //             dlim = ', ';
  //           });
  //         }
  //         else {
  //           address = address + dlim + addrObj.line;
  //         }
  //       }
  //       if (addrObj.city) address = address + dlim + addrObj.city;
  //       if (address === '') dlim = '';
  //       address = address + dlim + addrObj.postalCode;
  //     }
  //   }
  // }

  // return address;
}

function parseTelecom(telecomArray) {
  
  let blankTelecom = '';

  if (!telecomArray || !Array.isArray(telecomArray)) return blankTelecom;

  const filteredTelecoms = telecomArray.filter((tel) => tel.system === 'phone' && !tel.period.end && tel.use !== 'old');

  if (!filteredTelecoms.length) return blankTelecom;

  let primaryTelecom = filteredTelecoms.find((tel) => tel.use === 'home' && tel.value && tel.value !== 'Not Recorded');

  if (!primaryTelecom) {
    primaryTelecom = filteredTelecoms.find((tel) => tel.use === 'mobile' && tel.value && tel.value !== 'Not Recorded');
  }

  if (!primaryTelecom) {
    primaryTelecom = filteredTelecoms[0];
  }

  if (!primaryTelecom) return blankTelecom;

  return primaryTelecom.value;
}

module.exports = {
  getPractitionerRef,
  getPatientUuid,
  lazyLoadAdapter,
  parseRef,
  getOrganisationRef,
  getLocationRef,
  parseName,
  parseAddress,
  flatten,
  parseTelecom
};
