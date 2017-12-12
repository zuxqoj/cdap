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
import IconSVG from 'components/IconSVG';
import Popover from 'components/Popover';
import T from 'i18n-react';
import { deleteDraft } from 'components/PipelineList/DraftPipelineView/store/ActionCreator';
import { IDraft } from 'components/PipelineList/DraftPipelineView/types';

interface IProps {
  draft: IDraft;
}

const DraftActions: React.SFC<IProps> = ({ draft }) => {
  return (
    <div className="table-column action text-xs-center">
      <Popover
        target={(props) => <IconSVG name="icon-cog-empty" {...props} />}
        className="pipeline-list-popover"
        placement="bottom"
        bubbleEvent={false}
        enableInteractionInPopover={true}
      >
        <ul>
          <li className="disabled">{T.translate('commons.export')}</li>
          <hr />
          <li className="delete" onClick={deleteDraft.bind(null, draft)}>
            {T.translate('commons.delete')}
          </li>
        </ul>
      </Popover>
    </div>
  );
};

export default DraftActions;
