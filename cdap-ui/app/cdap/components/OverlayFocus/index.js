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
import Shepherd from 'shepherd.js';
import './OverlayFocus.scss';

const PADDING = 15;
const DISPLAY_BLOCK = 'block';
const DISPLAY_NONE = 'none';

const convertToPixel = (unit) => {
  return `${unit}px`;
}

/**
 * This component is used by GuidedTour to create a focus effect. It is binded directly
 * to events from GuidedTour (Shepherd).
 **/
export default class OverlayFocus extends Component {
  state = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: 0,
    display: DISPLAY_NONE
  };

  componentDidMount() {
    Shepherd.on('show', this.onShow);

    const HIDE_EVENTS = ['hide', 'complete', 'cancel'];

    HIDE_EVENTS.forEach((event) => {
      Shepherd.on(event, this.onHide);
    });
  }

  onShow = (obj) => {
    const step = obj.step;
    if (!step.options.shouldFocus) {
      if (this.state.display === DISPLAY_BLOCK) {
        this.onHide();
      }

      return;
    }

    const attachTo = step.options.attachTo;
    let elem;

    if (typeof attachTo === 'object') {
      if (attachTo.element instanceof Element) {
        elem = attachTo.element;
      } else {
        elem = document.querySelector(attachTo.element);
      }
    } else {
      // e.g. attachTo = '.some #element bottom';
      // we need to get '.some #element' as the selector;

      let selector = attachTo.slice(0, attachTo.lastIndexOf(' '));
      elem = document.querySelector(selector);
    }

    const elemRect = elem.getBoundingClientRect();

    this.setState({
      top: elemRect.top,
      bottom: elemRect.bottom,
      left: elemRect.left,
      right: elemRect.right,
      height: elemRect.height,
      display: DISPLAY_BLOCK
    });
  };

  onHide = () => {
    this.setState({
      display: DISPLAY_NONE,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      height: 0
    });
  };

  getTopStyle() {
    let height = this.state.top - PADDING;

    if (height < 0) {
      height = 0;
    }

    return {
      height: convertToPixel(height),
      display: this.state.display
    };
  }

  getBottomStyle() {
    let top = this.state.bottom + PADDING;

    return {
      top: convertToPixel(top),
      display: this.state.display
    };
  }

  getLeftStyle() {
    let height = this.state.height + (PADDING * 2);
    let width = this.state.left - PADDING;
    let top = this.state.top - PADDING;

    if (width < 0) {
      width = 0;
    }

    return {
      height: convertToPixel(height),
      width: convertToPixel(width),
      top: convertToPixel(top),
      display: this.state.display
    };
  }

  getRightStyle() {
    let height = this.state.height + (PADDING * 2);
    let left = this.state.right + PADDING;
    let top = this.state.top - PADDING;

    return {
      height: convertToPixel(height),
      left: convertToPixel(left),
      top: convertToPixel(top),
      display: this.state.display
    };
  }

  render() {
    return (
      <React.Fragment>
        <div
          className="curtain top"
          style={this.getTopStyle()}
        />
        <div
          className="curtain right"
          style={this.getRightStyle()}
        />
        <div
          className="curtain bottom"
          style={this.getBottomStyle()}
        />
        <div
          className="curtain left"
          style={this.getLeftStyle()}
        />
      </React.Fragment>
    );
  }
}
