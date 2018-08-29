/*
 * Copyright © 2018 Cask Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import cdapavsc from 'cdap-avsc';
import { LogicalTypes } from 'services/cdapavscwrapper/LogicalTypes';
import DateLogicalType from 'services/cdapavscwrapper/DateLogicalType';
import TimestampMicrosLogicalType from 'services/cdapavscwrapper/TimestampMicrosLogicalType';
import TimeMicrosLogicalType from 'services/cdapavscwrapper/TimeMicrosLogicalType';
import invert from 'lodash/invert';

// this dictionary is keeping the real AVRO logical type as the key
const LogicalTypesDictionary = {
  [LogicalTypes.DATE]: DateLogicalType,
  [LogicalTypes.TIMESTAMP_MICROS]: TimestampMicrosLogicalType,
  [LogicalTypes.TIME_MICROS]: TimeMicrosLogicalType,
};

// this is mapping the UI display type to the AVRO logical type
const DATE = 'date';
const TIME = 'time';
const TIMESTAMP = 'timestamp';

const UI_TO_AVRO_MAPPING = {
  [DATE]: LogicalTypes.DATE,
  [TIME]: LogicalTypes.TIME_MICROS,
  [TIMESTAMP]: LogicalTypes.TIMESTAMP_MICROS,
};

const AVRO_TO_UI_MAPPING = invert(UI_TO_AVRO_MAPPING);

export default class CdapAvscWrapper extends cdapavsc {
  public static parse = (schema, opts: object) => {
    const options = {
      ...opts,
      logicalTypes: LogicalTypesDictionary,
    };

    return cdapavsc.parse(schema, options);
  }

  public static formatType(type) {
    const logicalAvroType = UI_TO_AVRO_MAPPING[type];
    if (logicalAvroType) {
      return LogicalTypesDictionary[logicalAvroType].exportType();
    }

    return type;
  }

  public static getDisplayType(type) {
    if (AVRO_TO_UI_MAPPING[type]) {
      return AVRO_TO_UI_MAPPING[type];
    }

    return type;
  }
}
