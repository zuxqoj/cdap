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
      marginBottom: '15px',
      display: 'grid',
      gridTemplateColumns: '1fr 40px',
      alignItems: 'center',
      padding: '10px',
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
  onChange: (property, allValues, value: string) => void;
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

interface IState {
  isMacroTextbox: boolean;
}

class PropertyRowView extends React.Component<IPropertyRowProps, IState> {
  public state = {
    isMacroTextbox:
      isMacro(this.props.value) && objectQuery(this.props.pluginProperty, 'macroSupported'),
  };

  public shouldComponentUpdate(nextProps) {
    const rule =
      typeof nextProps.value !== 'undefined' &&
      (nextProps.value !== this.props.value ||
        nextProps.widgetProperty['widget-type'] !== this.props.widgetProperty['widget-type']);

    return rule;
  }

  private toggleMacro = () => {
    if (this.props.disabled) {
      return;
    }
    const newValue = !this.state.isMacroTextbox;

    if (newValue) {
      this.handleChange('${}');
    } else {
      this.handleChange('');
    }

    this.setState({ isMacroTextbox: newValue });
  };

  private handleChange = (value) => {
    this.props.onChange(this.props.widgetProperty.name, this.props.extraConfig.properties, value);
  };

  public render() {
    const {
      classes,
      pluginProperty,
      value,
      onChange,
      updateAllProperties,
      disabled,
      extraConfig,
      widgetProperty,
    } = this.props;

    let widgetClasses;
    const updatedWidgetProperty = {
      ...widgetProperty,
    };
    if (this.state.isMacroTextbox) {
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
      <div className={classnames(classes.row, { [classes.macroRow]: this.state.isMacroTextbox })}>
        <WidgetWrapper
          widgetProperty={updatedWidgetProperty}
          pluginProperty={pluginProperty}
          value={value || ''}
          // onChange={onChange}
          onChange={this.handleChange}
          updateAllProperties={updateAllProperties}
          extraConfig={extraConfig}
          classes={widgetClasses}
          disabled={disabled}
        />
        <If condition={pluginProperty.macroSupported}>
          <MacroIndicator
            onClick={this.toggleMacro}
            disabled={disabled}
            isActive={this.state.isMacroTextbox}
          />
        </If>
      </div>
    );
  }
}

// const PropertyRowView: React.FC<IPropertyRowProps> = ({
//   widgetProperty,
//   pluginProperty,
//   value,
//   onChange,
//   updateAllProperties,
//   extraConfig,
//   disabled,
//   classes,
// }) => {
//   // const widgetType = objectQuery(widgetProperty, 'widget-type');
//   const [isMacroTextbox, setIsMacroTextbox] = React.useState<boolean>(
//     isMacro(value) && objectQuery(pluginProperty, 'macroSupported')
//   );

//   if (widgetProperty['widget-type'] === 'hidden') {
//     return null;
//   }

//   const updatedWidgetProperty = {
//     ...widgetProperty,
//   };

//   function toggleMacro() {
//     if (disabled) {
//       return;
//     }
//     const newValue = !isMacroTextbox;

//     if (newValue) {
//       onChange('${}');
//     } else {
//       onChange('');
//     }

//     setIsMacroTextbox(newValue);
//   }

//   let widgetClasses;

//   if (isMacroTextbox) {
//     const currentWidget = updatedWidgetProperty['widget-type'];
//     if (EditorTypeWidgets.indexOf(currentWidget) === -1) {
//       updatedWidgetProperty['widget-type'] = 'textbox';
//       updatedWidgetProperty['widget-attributes'] = {};
//     }

//     widgetClasses = {
//       label: classes.label,
//     };
//   }

//   console.log('update', value);

//   return (
//     <div className={classnames(classes.row, { [classes.macroRow]: isMacroTextbox })}>
//       <WidgetWrapper
//         widgetProperty={updatedWidgetProperty}
//         pluginProperty={pluginProperty}
//         value={value || ''}
//         onChange={onChange}
//         updateAllProperties={updateAllProperties}
//         extraConfig={extraConfig}
//         classes={widgetClasses}
//         disabled={disabled}
//       />
//       <If condition={pluginProperty.macroSupported}>
//         <MacroIndicator onClick={toggleMacro} disabled={disabled} isActive={isMacroTextbox} />
//       </If>
//     </div>
//   );
// };

const PropertyRow = withStyles(styles)(PropertyRowView);
export default PropertyRow;
