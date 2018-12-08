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
import { deletePipeline } from 'components/PipelineList/DeployedPipelineView/store/ActionCreator';
import { IPipeline } from 'components/PipelineList/DeployedPipelineView/types';
import ActionsPopover, { IAction } from 'components/ActionsPopover';
import { duplicatePipeline, getPipelineConfig } from 'services/PipelineUtils';
import PipelineExportModal from 'components/PipelineExportModal';
import T from 'i18n-react';

interface IProps {
  pipeline: IPipeline;
}

interface IState {
  showExport: boolean;
}

class DeployedActions extends React.PureComponent<IProps, IState> {
  public state = {
    showExport: false,
  };

  private pipelineConfig = {};

  private showExportModal = () => {
    getPipelineConfig(this.props.pipeline.name).subscribe((pipelineConfig) => {
      this.pipelineConfig = pipelineConfig;

      this.setState({
        showExport: true,
      });
    });
  };

  private closeExportModal = () => {
    this.pipelineConfig = {};

    this.setState({
      showExport: false,
    });
  };

  private actions: IAction[] = [
    {
      label: T.translate('commons.duplicate'),
      actionFn: duplicatePipeline.bind(null, this.props.pipeline.name),
    },
    {
      label: T.translate('commons.export'),
      actionFn: this.showExportModal,
    },
    {
      label: 'separator',
    },
    {
      label: T.translate('commons.delete'),
      actionFn: deletePipeline.bind(null, this.props.pipeline),
      className: 'delete',
    },
  ];

  public render() {
    return (
      <div className="table-column action text-xs-center">
        <ActionsPopover actions={this.actions} />

        <PipelineExportModal
          isOpen={this.state.showExport}
          onClose={this.closeExportModal}
          pipelineConfig={this.pipelineConfig}
        />
      </div>
    );
  }
}

export default DeployedActions;
