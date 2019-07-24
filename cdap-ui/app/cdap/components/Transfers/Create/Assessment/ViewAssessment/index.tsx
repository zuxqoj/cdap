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
import { transfersCreateConnect } from '../../context';
import StepButtons from '../../StepButtons';
import CheckCircle from '@material-ui/icons/CheckCircle';
import SchemaAssessment from '../SchemaAssessment';

const styles = (theme): StyleRules => {
  return {
    section: {
      borderBottom: `2px solid ${theme.palette.grey[400]}`,
      padding: '25px',
    },
    halfSection: {
      display: 'grid',
      gridTemplateColumns: '50% 50%',
      fontSize: '1.5rem',
    },
    successIcon: {
      color: theme.palette.green[100],
      fontSize: '18px',
      marginRight: '10px',
    },
  };
};

interface IProps extends WithStyles<typeof styles> {
  sourceConfig: any;
}

const ViewAssessmentView: React.SFC<IProps> = ({ classes, sourceConfig }) => {
  return (
    <div>
      <div className={classes.section}>
        <h2>Network Assessment</h2>
        <br />
        <div className={classes.halfSection}>
          <div>
            <CheckCircle className={classes.successIcon} />
            MySQL
            <h3 />
          </div>
          <div>
            <CheckCircle className={classes.successIcon} />
            Google BigQuery
          </div>
        </div>
      </div>

      <div className={classes.section}>
        <h2>Permission Assessment</h2>
        <br />
        <div className={classes.halfSection}>
          <div>
            <div>
              <strong>MySQL</strong>
            </div>

            <div>
              <strong>User:</strong> replicate
            </div>
            <br />
            <div>
              <CheckCircle className={classes.successIcon} />
              User has the required permission.
            </div>
          </div>

          <div>
            <div>
              <strong>Google BigQuery</strong>
            </div>
            <br />
            <div>
              <div>
                <CheckCircle className={classes.successIcon} />
                Service account has the required role.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={classes.section}>
        <h2>Schema Assessment</h2>
        <SchemaAssessment />
      </div>

      <br />
      <StepButtons />
    </div>
  );
};

const StyledViewAssessment = withStyles(styles)(ViewAssessmentView);
const ViewAssessment = transfersCreateConnect(StyledViewAssessment);
export default ViewAssessment;
