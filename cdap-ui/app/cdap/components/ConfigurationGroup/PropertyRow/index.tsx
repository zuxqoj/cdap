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

import * as React from 'react';
import withStyles, { WithStyles, StyleRules } from '@material-ui/core/styles/withStyles';
import { objectQuery } from 'services/helpers';
import If from 'components/If';
import { IPluginProperty, IWidgetProperty } from 'components/ConfigurationGroup/types';
import classnames from 'classnames';
import WidgetWrapper from 'components/ConfigurationGroup/WidgetWrapper';
import { isMacro } from 'components/ConfigurationGroup/utilities';
import MacroIndicator from 'components/ConfigurationGroup/MacroIndicator';

const styles = (theme): StyleRules => {
  return {
    row: {
      marginBottom: 15,
      display: 'grid',
      gridTemplateColumns: '1fr 40px',
      alignItems: 'center',
      padding: 10,
    },
    macroRow: {
      backgroundColor: theme.palette.grey[500],
    },
    label: {
      backgroundColor: theme.palette.grey[500],
    },
  };
};

interface IPropertyRowProps extends WithStyles<typeof styles> {
  widgetProperty: IWidgetProperty;
  pluginProperty: IPluginProperty;
  value: string;
  onChange: (value: string) => void;
  updateAllProperties: (values) => void;
  extraConfig: any;
  disabled: boolean;
}

const EditorTypeWidgets = [
  'javascript-editor',
  'python-editor',
  'rules-engine-editor',
  'scala-editor',
  'sql-editor',
  'textarea',
  'wrangler-directives',
];

const PropertyRowView: React.FC<IPropertyRowProps> = ({
  widgetProperty,
  pluginProperty,
  value,
  onChange,
  updateAllProperties,
  extraConfig,
  disabled,
  classes,
}) => {
  const widgetType = objectQuery(widgetProperty, 'widget-type');
  const [isMacroTextbox, setIsMacroTextbox] = React.useState<boolean>(
    isMacro(value) && objectQuery(pluginProperty, 'macroSupported')
  );

  if (widgetType === 'hidden') {
    return null;
  }

  const updatedWidgetProperty = {
    ...widgetProperty,
  };

  function toggleMacro() {
    if (disabled) {
      return;
    }
    const newValue = !isMacroTextbox;

    if (newValue) {
      onChange('${}');
    } else {
      onChange('');
    }

    setIsMacroTextbox(newValue);
  }

  let widgetClasses;

  if (isMacroTextbox) {
    const currentWidget = updatedWidgetProperty['widget-type'];
    if (EditorTypeWidgets.indexOf(currentWidget) === -1) {
      updatedWidgetProperty['widget-type'] = 'textbox';
      updatedWidgetProperty['widget-attributes'] = {};
    }

    widgetClasses = {
      label: classes.label,
    };
  }

  return (
    <div className={classnames(classes.row, { [classes.macroRow]: isMacroTextbox })}>
      <WidgetWrapper
        widgetProperty={updatedWidgetProperty}
        pluginProperty={pluginProperty}
        value={value || ''}
        onChange={onChange}
        updateAllProperties={updateAllProperties}
        extraConfig={extraConfig}
        classes={widgetClasses}
        disabled={disabled}
      />
      <If condition={pluginProperty.macroSupported}>
        <MacroIndicator onClick={toggleMacro} disabled={disabled} isActive={isMacroTextbox} />
      </If>
    </div>
  );
};

const PropertyRow = withStyles(styles)(PropertyRowView);
export default PropertyRow;
