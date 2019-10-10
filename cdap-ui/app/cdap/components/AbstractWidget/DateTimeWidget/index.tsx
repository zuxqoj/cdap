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

import React, { useState } from 'react';
import { IWidgetProps } from 'components/AbstractWidget';
import { WIDGET_PROPTYPES } from 'components/AbstractWidget/constants';
import ExpandableTimeRange from 'components/TimeRangePicker/ExpandableTimeRange';

interface IDateTimeWidgetProps {
  format?: string; // what options should there be for formats? (for sending to backend)
}

interface IDateTimeProps extends IWidgetProps<IDateTimeWidgetProps> {}

const DateTimeWidget: React.FC<IDateTimeProps> = ({ value, onChange, disabled, widgetProps }) => {
  const initStart = typeof value === 'string' ? parseInt(value, 10) : 0;
  const [start, updateStart] = useState(initStart);

  const onChangeHandler = (dateTime: string) => {
    const newStart = parseInt(dateTime, 10) || 0;
    // reformat if needed (if we were given a format for backend)
    updateStart(newStart);
    onChange(newStart);
  };

  return (
    <div>
      <ExpandableTimeRange
        showRange={false}
        start={start}
        onChange={onChangeHandler}
        disabled={disabled}
      />
    </div>
  );
};

export default DateTimeWidget;

(DateTimeWidget as any).propTypes = WIDGET_PROPTYPES;
