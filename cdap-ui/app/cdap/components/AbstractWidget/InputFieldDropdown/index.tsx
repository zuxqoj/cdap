/*
 * Copyright © 2019 Cask Data, Inc.
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
import React from 'react';
import Select from 'components/AbstractWidget/FormInputs/Select';
import { IWidgetProps, IStageSchema } from 'components/AbstractWidget';
import { objectQuery } from 'services/helpers';
import { WIDGET_PROPTYPES } from 'components/AbstractWidget/constants';
import MultiSelect from '../FormInputs/MultiSelect';

interface IField {
  name: string;
  type: string[];
}

const delimiter = ',';

interface IInputFieldWidgetProps {
  multiselect?: boolean;
  allowedTypes?: string[];
}

interface IInputFieldProps extends IWidgetProps<IInputFieldWidgetProps> {}

// We are assuming all incoming stages have the same schema
function getFields(schemas: IStageSchema[], allowedTypes: string[]) {
  let fields = [];
  if (!schemas || schemas.length === 0) {
    return fields;
  }
  const stage = schemas[0];

  try {
    const unparsedFields = JSON.parse(stage.schema).fields;

    if (unparsedFields.length > 0) {
      fields = unparsedFields
        .filter((field: IField) => containsType(field.type, allowedTypes))
        .map((field: IField) => field.name);
    }
  } catch {
    // tslint:disable-next-line: no-console
    console.log('Error: Invalid JSON schema');
  }
  return fields;
}

// Function that checks if types contains a type that is in allowedTypes
// This is meant to handle nullable fields since a nullable string type is
// presented as ['string','null'].
function containsType(types: Array<object | string>, allowedTypes: string[]) {
  if (allowedTypes.length == 0) {
    return true;
  }

  return allowedTypes.includes(extractType(types));
}

function extractType(types) {
  let value = types;
  if (types instanceof Array) {
    if (types.length === 1) {
      value = types[0];
    } else if (types.length === 2 && types.includes('null')) {
      value = types.indexOf('null') === 0 ? types[1] : types[0];
    }
  }

  if (typeof value === 'object') {
    value = value.logicalType || value;
  }
  return value;
}

const InputFieldDropdown: React.FC<IInputFieldProps> = ({
  value,
  onChange,
  disabled,
  extraConfig,
  widgetProps,
}) => {
  const inputSchema = objectQuery(extraConfig, 'inputSchema');

  // TODO: Add handling for empty values in dropdown (https://issues.cask.co/browse/CDAP-16143)
  const isMultiSelect: boolean = widgetProps.multiselect || false;

  // List of type names to allow in the dropdown
  // (ex. ['string']) display fields of type string and nullable string
  // in the dropdown
  // TODO: Add support for disallowedTypes (https://issues.cask.co/browse/CDAP-16144)
  const allowedTypes: string[] = widgetProps.allowedTypes || [];

  const fieldValues = getFields(inputSchema, allowedTypes);

  const newValue = value
    .toString()
    .split(delimiter)
    .filter((value) => fieldValues.includes(value))
    .join(delimiter);

  if (newValue !== value) {
    onChange(newValue);
  }

  if (isMultiSelect) {
    const multiSelectWidgetProps = {
      delimiter,
      options: fieldValues.map((field) => ({ id: field, label: field })),
    };

    return (
      <MultiSelect
        value={value}
        onChange={onChange}
        widgetProps={multiSelectWidgetProps}
        disabled={disabled}
      />
    );
  }
  const selectWidgetProps = {
    options: fieldValues,
  };
  return (
    <Select value={value} onChange={onChange} widgetProps={selectWidgetProps} disabled={disabled} />
  );
};

export default InputFieldDropdown;

(InputFieldDropdown as any).propTypes = WIDGET_PROPTYPES;
