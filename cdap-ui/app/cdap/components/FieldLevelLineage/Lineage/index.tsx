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

import * as React from 'react';
import Fields from 'components/FieldLevelLineage/Fields';
import IncomingLineage from 'components/FieldLevelLineage/LineageSummary/IncomingLineage';
import OutgoingLineage from 'components/FieldLevelLineage/LineageSummary/OutgoingLineage';
import OperationsModal from 'components/FieldLevelLineage/OperationsModal';
import { connect } from 'react-redux';
import T from 'i18n-react';
import './Lineage.scss';

const PREFIX = 'features.FieldLevelLineage';

interface IField {
  name: string;
  lineage: boolean;
}

interface ILineageViewProps {
  fields: IField[];
  datasetId: string;
}

const LineageView: React.SFC<ILineageViewProps> = ({fields, datasetId}) => {
  if (fields.length === 0) {
    return (
      <div className="field-level-lineage-container empty">
        {T.translate(`${PREFIX}.noFields`, { datasetId })}
      </div>
    );
  }

  return (
    <div className="field-level-lineage-container">
      <div className="row">
        <div className="col-xs-4">
          <IncomingLineage />
        </div>

        <div className="col-xs-4">
          <Fields />
        </div>

        <div className="col-xs-4">
          <OutgoingLineage />
        </div>
      </div>
      <OperationsModal />
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    fields: state.lineage.fields,
    datasetId: state.lineage.datasetId,
  };
};

const Lineage = connect(
  mapStateToProps,
)(LineageView);

export default Lineage;
