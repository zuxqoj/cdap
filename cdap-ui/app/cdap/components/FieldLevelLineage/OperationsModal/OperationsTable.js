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
import classnames from 'classnames';

export default class OperationsTable extends Component {
  static propTypes = {
    operations: PropTypes.array
  };

  state = {
    activeId: null
  };

  componentWillReceiveProps() {
    this.setState({
      activeId: null
    });
  }

  convertId(id) {
    return id.replace(/\./g, '_');
  }

  handleInputClick(field) {
    const id = this.convertId(field.origin);

    this.setState({
      activeId: id
    });
  }

  joinEndpoints(endpoints) {
    if (!endpoints) { return null; }

    return endpoints
      .map((dataset) => dataset.name)
      .join(', ');
  }

  renderInput(operation) {
    return this.joinEndpoints(operation.inputs.endPoints);
  }

  renderOutput(operation) {
    return this.joinEndpoints(operation.outputs.endPoints);
  }

  renderInputFields(operation) {
    const fields = operation.inputs.fields;
    if (!fields) { return '--'; }

    return fields.map((field, i) => {
      return (
        <span>
          <span
            className="input-field"
            onClick={this.handleInputClick.bind(this, field)}
          >
            {field.name}
          </span>
          { i !== fields.length - 1 ? ', ' : null }
        </span>
      );
    });
  }

  renderOutputFields(operation) {
    if (!operation.outputs.fields) { return '--'; }

    return operation.outputs.fields
      .join(', ');
  }

  render() {
    return (
      <div className="operations-table-container">
        <table className="table">
          <thead>
            <th></th>
            <th>Input</th>
            <th>Input fields</th>
            <th>Operations</th>
            <th>Description</th>
            <th>Output</th>
            <th>Output fields</th>
          </thead>

          <tbody>
            {
              this.props.operations.map((operation, i) => {
                const id = this.convertId(operation.id);

                return (
                  <tr
                    key={operation.id}
                    id={id}
                    className={classnames({'active': id === this.state.activeId})}
                  >
                    <td>{ i + 1 }</td>
                    <td>{ this.renderInput(operation) }</td>
                    <td>{ this.renderInputFields(operation) }</td>
                    <td>{ operation.name }</td>
                    <td>{ operation.description }</td>
                    <td>{ this.renderOutput(operation) }</td>
                    <td>{ this.renderOutputFields(operation) }</td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    );
  }
}
