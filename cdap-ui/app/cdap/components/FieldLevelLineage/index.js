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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {getFields, setTimeRange, setCustomTimeRange, getLineageSummary} from 'components/FieldLevelLineage/store/ActionCreator';
import {Provider} from 'react-redux';
import Store, {Actions, TIME_OPTIONS} from 'components/FieldLevelLineage/store/Store';
import Fields from 'components/FieldLevelLineage/Fields';
import TimePicker from 'components/FieldLevelLineage/TimePicker';

require('./FieldLevelLineage.scss');

export default class FieldLevelLineage extends Component {
  static propTypes = {
    entityId: PropTypes.string
  };

  componentWillMount() {
    const queryParams = this.parseQueryString();

    if (!queryParams) {
      getFields(this.props.entityId);
      return;
    }

    Store.dispatch({
      type: Actions.setDatasetId,
      payload: {
        datasetId: this.props.entityId
      }
    });

    if (queryParams.time) {
      setTimeRange(queryParams.time);
    }

    if (queryParams.time === TIME_OPTIONS[0]) {
      const timeObj = {
        start: parseInt(queryParams.start, 10),
        end: parseInt(queryParams.end, 10)
      };

      setCustomTimeRange(timeObj);
    }

    if (queryParams.field) {
      getLineageSummary(queryParams.field);
    }
  }

  componentWillUnmount() {
    Store.dispatch({
      type: Actions.reset
    });
  }

  parseQueryString() {
    const queryStr = location.search.slice(1);

    if (queryStr.length === 0) { return null; }

    let queryObj = {};

    queryStr
      .split('&')
      .forEach((pair) => {
        const index = pair.indexOf('=');
        const key = pair.slice(0, index);
        const value = pair.slice(index + 1);

        queryObj[key] = value;
      });

    return queryObj;
  }

  render() {
    return (
      <Provider store={Store}>
        <div className="field-level-lineage-container">
          <TimePicker />

          <Fields />
        </div>
      </Provider>
    );
  }
}
