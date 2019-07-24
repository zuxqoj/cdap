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
import { transfersCreateConnect } from 'components/Transfers/Create/context';
import TABLES from './tablesDefinition';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import CheckCircle from '@material-ui/icons/CheckCircle';
import Warning from '@material-ui/icons/Warning';
import Error from '@material-ui/icons/Error';

const styles = (): StyleRules => {
  return {};
};

interface IProps extends WithStyles<typeof styles> {}

const StyledCheckCircle = withStyles({});

const ICON_MAP = {
  default: CheckCircle,
  ERROR: Error,
  WARNING: Warning,
};

const SchemaAssessmentView: React.SFC<IProps> = ({}) => {
  const [table, setTable] = React.useState(0);

  return (
    <div>
      <div>
        <FormControl>
          <InputLabel>Table</InputLabel>
          <Select value={table} onChange={(e) => setTable.bind(null, e.target.value)}>
            {TABLES.map((tableInfo, i) => {
              return (
                <MenuItem key={tableInfo.name} value={i}>
                  {tableInfo.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </div>

      <div>
        <div className="grid grid-container">
          <div className="grid-header">
            <div className="grid-row">
              <div />
              <div>Field name</div>
              <div>Source Type</div>
              <div>Target Type</div>
              <div />
            </div>
          </div>

          <div className="grid-body">
            {TABLES[table].columns.map((column) => {
              const IconComp =
                typeof column.issue === 'string' ? ICON_MAP[column.issue] : ICON_MAP.default;

              return (
                <div key={column.field} className="grid-row">
                  <div>
                    <IconComp />
                  </div>
                  <div>{column.field}</div>
                  <div>{column.sourceType}</div>
                  <div>{column.targetTypes.length ? column.targetTypes[0] : null}</div>
                  <div />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const StyledSchemaAssessment = withStyles(styles)(SchemaAssessmentView);
const SchemaAssessment = transfersCreateConnect(StyledSchemaAssessment);
export default SchemaAssessment;
