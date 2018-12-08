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
import T from 'i18n-react';
import { deleteDraft } from 'components/PipelineList/DraftPipelineView/store/ActionCreator';
import { IDraft } from 'components/PipelineList/DraftPipelineView/types';
import ActionsPopover, { IAction } from 'components/ActionsPopover';
import PipelineExportModal from 'components/PipelineExportModal';

interface IProps {
  draft: IDraft;
}

interface IState {
  showExport: boolean;
}

class DraftActions extends React.PureComponent<IProps, IState> {
  public state = {
    showExport: false,
  };

  public pipelineConfig = {};

  private openExportModal = (): void => {
    const draft = this.props.draft;
    this.pipelineConfig = {
      name: draft.name,
      description: draft.description,
      artifact: draft.artifact,
      config: draft.config,
    };

    this.setState({
      showExport: true,
    });
  };

  private closeExportModal = (): void => {
    this.pipelineConfig = {};
    this.setState({
      showExport: false,
    });
  };

  private actions: IAction[] = [
    {
      label: T.translate('commons.export'),
      actionFn: this.openExportModal,
    },
    {
      label: 'separator',
    },
    {
      label: T.translate('commons.delete'),
      actionFn: deleteDraft.bind(null, this.props.draft),
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

export default DraftActions;
