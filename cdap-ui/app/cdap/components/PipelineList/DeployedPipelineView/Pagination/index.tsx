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
import { connect } from 'react-redux';
import PaginationStepper from 'components/PaginationStepper';
import './Pagination.scss';

interface IPaginationProps {
  onNext: () => void;
  onPrev: () => void;
}

const PaginationView: React.SFC<IPaginationProps> = ({ onNext, onPrev }) => {
  return (
    <div className="pagination-container float-right">
      <PaginationStepper
        onNext={onNext}
        onPrev={onPrev}
        prevDisabled={false}
        nextDisabled={false}
      />
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    currentPage: state.deployed.currentPage,
  };
};

const mapDispatch = (dispatch) => {
  return {
    onNext: () => {
      // dispatch({
      //   type:
      // });
      console.log('next');
    },
    onPrev: () => {
      console.log('prev');
    },
  };
};

const Pagination = connect(
  mapStateToProps,
  mapDispatch
)(PaginationView);

export default Pagination;
