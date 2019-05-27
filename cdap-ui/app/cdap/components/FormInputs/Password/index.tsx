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
import TextField from '@material-ui/core/TextField';
import withStyles, { WithStyles } from '@material-ui/core/styles/withStyles';
import ThemeWrapper from 'components/ThemeWrapper';
import PropTypes from 'prop-types';
import InputAdornment from '@material-ui/core/InputAdornment';
import IconButton from '@material-ui/core/IconButton';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';


const styles = (theme) => {
  return {
    input: {
      padding: 10,
    },
    button: {
      padding: 0
    }
  }
}

interface IPasswordProps extends WithStyles<typeof styles>{
  value: string;
  onChange: (value: string) => void;
}

interface PasswordState {
  showPassword: boolean;
}

function Password({ value, onChange, classes }: IPasswordProps) {
  //state: need to know whether we are showing password
  const [showPassword, setPwdVisibility] = React.useState<PasswordState>(false);

  const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const v = event.target.value;
    if (v && typeof onChange === 'function') {
      onChange(v);
    }
  };

  const handleClickShowPassword = () => {
    setPwdVisibility(!showPassword)
  };

  return (
    <TextField
      fullWidth
      variant="outlined"
      className={classes.input}
      type={showPassword? 'text' : 'password'}
      value={value}
      onChange={onChangeHandler}
      InputProps={{
        classes,
        startAdornment: (
          <InputAdornment position="start">
            <IconButton
            className={classes.button}
            aria-label="Toggle password visibility"
            onClick={handleClickShowPassword}
            >
              {showPassword? <Visibility/>: <VisibilityOff/>}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}

const StyledPassword = withStyles(styles)(Password);

export default function StyledPasswordWrapper(props) {
  return (
    <ThemeWrapper>
      <StyledPassword {...props} />
    </ThemeWrapper>
  );
}

(StyledPassword as any).propTypes = {
  value: PropTypes.string,
};
