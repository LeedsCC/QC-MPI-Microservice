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

const transform = require('qewd-transform-json').transform;
const { ResourceName } = require('./enums');

function getPractitionerRef(resource) {

  let practitionerReference = null;

  if (resource.resourceType === ResourceName.PATIENT) {

    if (resource.managingOrganization) {
      
      practitionerReference = resource.managingOrganization.reference;
    }
  }

  return practitionerReference;
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

/**
 * Checks if period for name/address is valid
 * @param {string} period 
 * @returns {boolean}
 */
function isActive(period) {
  if (!period) return true;

  let valid = true;

  const currentDate = new Date().getTime();

  if (period.start && new Date(period.start).getTime() > currentDate) {
    valid = false;
  }

  if (period.end && new Date(period.end).getTime() < currentDate) {
    valid = false;
  }

  return valid;
}

//@TODO Re check functionality for correct spaces
function parseName(name) {

  let primaryName = null;

  if (Array.isArray(name) && name.length) {
    primaryName = name.find((nameItem) => {
      return nameItem.use === 'official'
        && isActive(nameItem.period);
    });

    if (!primaryName) {
      primaryName = name.find((nameItem) => {
        return nameItem.use !== 'old' 
          && nameItem.use !== 'temp'
          && isActive(nameItem.period);
      });
    }
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

  if (resource
    && resource.resourceType === ResourceName.PRACTITIONERROLE 
    && resource.organization) {

    organisationRef = resource.organization.reference;
  }

  return organisationRef;
}

//@TODO package this piece of code
function parseAddress(addressArray, addressUse) {

  if (!addressArray || !addressArray.length) {
    return null;
  }

  let mainAddress = addressArray.find((addr) => { 
    return addr.use === addressUse 
      && isActive(addr.period);
  });

  if (!mainAddress) {
    mainAddress = addressArray[0];
  }

  if (mainAddress) {

    if (mainAddress.text) {
      return mainAddress.text;
    }

    const { line, city, district, state, postalCode, country } = mainAddress;
  
    let addressComponents = [];

    if (line && line.length) {
      addressComponents = addressComponents.concat(line.filter((l) => !!l).map((l) => String(l).trim()));
    }

    if (city) {
      addressComponents.push(String(city).trim());
    }

    if (district) {
      addressComponents.push(String(district).trim());
    }

    if (state) {
      addressComponents.push(String(state).trim());
    }

    if (country) {
      addressComponents.push(String(country).trim());
    }

    if (postalCode) {
      addressComponents.push(String(postalCode).trim());
    }

    if (addressComponents.length) {
      return addressComponents.join(', ');
    }
  }

  return null;
}

function parseTelecom(telecomArray) {
  
  let blankTelecom = null;

  if (!telecomArray || !Array.isArray(telecomArray)) return blankTelecom;

  const filteredTelecoms = telecomArray.filter((tel) => {
    
    if(tel.system !== 'phone' || tel.use === 'old') return false;
    
    return isActive(tel.period);
  });

  if (!filteredTelecoms.length) return blankTelecom;

  let primaryTelecom = filteredTelecoms.find((tel) => tel.use === 'home' && tel.value && tel.value !== 'Not Recorded');

  if (!primaryTelecom) {
    primaryTelecom = filteredTelecoms.find((tel) => tel.use === 'mobile' && tel.value && tel.value !== 'Not Recorded');
  }

  if (!primaryTelecom) {
    primaryTelecom = filteredTelecoms.find((tel) => !tel.use && tel.value && tel.value !== 'Not Recorded');
  }

  if (!primaryTelecom) return blankTelecom;

  return primaryTelecom.value;
}

function parseEmail(telecomArray) {
  
    let blankTelecom = null;
  
    if (!telecomArray || !Array.isArray(telecomArray)) return blankTelecom;
  
    const filteredTelecoms = telecomArray.filter((tel) => {
      
        if(tel.system !== 'email' || tel.use === 'old') return false;
      
        return isActive(tel.period);
    });
  
    if (!filteredTelecoms.length) return blankTelecom;
  
    let primaryTelecom = filteredTelecoms.find((tel) => tel.use === 'home' && tel.value && tel.value !== 'Not Recorded');
  
    if (!primaryTelecom) return blankTelecom;
  
    return primaryTelecom.value;
}

/**
 * Maps query parameters to FHIR search string
 *
 * @param  {string} resourceType
 * @param  {Object} queryParams
 * @param  {Object} searchConfig
 * @return {string}
 */
function mapQuery(resourceType, queryParams, searchConfig) {
  let searchMap = {};

  searchMap[resourceType] = queryParams;

  const queryMap = transform(searchConfig[resourceType], searchMap);

  const queryComponents = [];

  Object.getOwnPropertyNames(queryMap).forEach((component) => {
    queryComponents.push(queryMap[component]);
  });

  const query = queryComponents.join('&');

  if (!query) {
    throw Error(`Error mapping query ${ queryParams } for resourceType ${ resourceType }`);
  }

  return query;
}

/**
 *
 * @param {fhir.CodeableConcept | fhir.Coding[] | fhir.Coding | null} coding
 * @returns {fhir.Coding[]}
 */
const flattenCoding = (coding) => {
    /** @type {fhir.Coding[]} */
    let flattened = []

    if (!coding) {
        return flattened
    }

    // fhir.Coding[]
    if (Array.isArray(coding)) {
        flattened = [...coding]
    } else if (coding.coding) {
        const codes = coding.coding || []

        flattened = [...codes]
    } else {
        flattened = [coding]
    }

    return flattened
}

/**
 * @param {fhir.CodeableConcept | fhir.Coding[] | fhir.Coding | null} coding
 * @param {fhir.CodeableConcept | fhir.Coding[] | fhir.Coding | null} targetCoding
 * @returns {boolean}
 */
const matchCoding = (coding, targetCoding) => {
    if (!coding || !targetCoding) {
        return false
    }

    const base = flattenCoding(coding)
    const target = flattenCoding(targetCoding)

    if (!base.length) {
        throw Error("No coding provided to compare")
    }

    if (!target.length) {
        throw Error("No coding to compare to")
    }

    return target.some((searchCode) => {
        return !!base.find((c) => c.code === searchCode.code && c.system === searchCode.system)
    })
}

function parseResolved(patient) {
    return isResolvedByCode(patient, "01")
}

/**
 * @param {string} code
 * @param {fhir.Patient} patient
 */
function isResolvedByCode(patient, code) {
    const { identifier } = patient

    if (!identifier) {
        return false
    }

    const nhsNumberIdentifier = identifier.find((id) => id.system === "https://fhir.nhs.uk/Id/nhs-number")

    if (!nhsNumberIdentifier) {
        return false
    }

    const { extension } = nhsNumberIdentifier

    if (!extension) {
        return false
    }

    const nhsVerifiedExtension = extension.find((ex) => {
        return (
            ex.valueCodeableConcept &&
            matchCoding(ex.valueCodeableConcept, [{
                system: "https://fhir.hl7.org.uk/STU3/CodeSystem/CareConnect-NHSNumberVerificationStatus-1",
                code,
            }, 
            {
                system: "https://fhir.hl7.org.uk/STU3/ValueSet/CareConnect-NHSNumberVerificationStatus-1",
                code
            }])
        )
    })

    console.log("Nhs verified status")
    console.log(nhsVerifiedExtension)

    return !!nhsVerifiedExtension
}

module.exports = {
  getPractitionerRef,
  lazyLoadAdapter,
  parseRef,
  getOrganisationRef,
  parseName,
  parseAddress,
  parseTelecom,
  mapQuery,
  parseEmail,
  parseResolved
};
