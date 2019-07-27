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
import { MyDeltaApi } from 'api/delta';
import { getCurrentNamespace } from 'services/NamespaceStore';
import moment from 'moment';
import Configuration from './Configuration';
import { TransfersDetailContext } from 'components/Transfers/Detail/context';
import LoadingSVGCentered from 'components/LoadingSVGCentered';

const styles = (): StyleRules => {
  return {};
};

interface IDetailProps extends WithStyles<typeof styles> {
  match: {
    params: {
      id: string;
    };
  };
}

interface IDetailState {
  name: string;
  id: string;
  description: string;
  updated: any;
  source: any;
  sourceConfig: any;
  target: any;
  targetConfig: any;
}

class DetailView extends React.PureComponent<IDetailProps, IDetailState> {
  public componentDidMount() {
    const id = objectQuery(this.props.match, 'params', 'id');
    const params = {
      context: getCurrentNamespace(),
      id,
    };

    MyDeltaApi.get(params).subscribe((res) => {
      this.setState({
        ...res.properties,
        name: res.name,
        id: res.id,
        updated: res.updated,
        description: res.description,
        loading: false,
      });
    });
  }

  public state = {
    name: '',
    id: '',
    description: '',
    updated: null,
    source: {},
    sourceConfig: {},
    target: {},
    targetConfig: {},
    loading: true,
  };

  public render() {
    if (this.state.loading) {
      return <LoadingSVGCentered />;
    }

    return (
      <TransfersDetailContext.Provider value={this.state}>
        <div>
          <div className="container">
            <h1>{this.state.name}</h1>
            <small>
              Last updated {moment(this.state.updated).format('MMM D, YYYY [at] hh:mm A')}
            </small>
            <div>{this.state.description}</div>
          </div>

          <Configuration />
        </div>
      </TransfersDetailContext.Provider>
    );
  }
}

const Detail = withStyles(styles)(DetailView);
export default Detail;
