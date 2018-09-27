/*
 * Copyright © 2016 Cask Data, Inc.
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

import React, {Component} from 'react';
import ConfigurableTab from '../ConfigurableTab';
import {MyMarketApi} from 'api/market';
import MarketAction from './action/market-action.js';
import find from 'lodash/find';
import MarketStore from 'components/Market/store/market-store.js';
import T from 'i18n-react';
import AllTabContents from 'components/Market/AllTab';
import UsecaseTab from 'components/Market/UsecaseTab';
import {CATEGORY_MAP} from 'components/Market/CategoryMap';

export default class Market extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tabsList: [],
      tabConfig: null,
      activeTab: 1
    };
  }
  componentDidMount() {
    this.sub = MarketStore.subscribe(() => {
      let activeFilter = MarketStore.getState().filter;
      let filter = find(this.state.tabConfig.tabs, { filter: activeFilter });

      if (filter && filter.id !== this.state.activeTab) {
        this.setState({
          activeTab: filter.id
        });
      }
    });

    MyMarketApi.list()
      .combineLatest(MyMarketApi.getCategories())
      .subscribe((res) => {
        const newState = {
          tabConfig: this.constructTabConfig(res[1])
        };
        const searchFilter = find(newState.tabConfig.tabs, { filter: MarketStore.getState().filter });

        if (searchFilter) {
          newState.activeTab = searchFilter.id;
        }

        this.setState(newState);
        MarketAction.setList(res[0]);
      }, (err) => {
        MarketAction.setError();
        console.log('Error', err);
      });
  }

  componentWillUnmount() {
    MarketStore.dispatch({ type: 'RESET' });

    if (this.sub) {
      this.sub();
    }
  }

  constructTabConfig(categories) {
    const tabConfig = {
      defaultTab: 1,
      defaultTabContent: <AllTabContents />,
      layout: 'vertical',
    };

    const tabs = [
      {
        id: 1,
        filter: '*',
        icon: {
          type: 'font-icon',
          arguments: {
            data: 'icon-all'
          }
        },
        name: T.translate('features.Market.tabs.all'),
        content: <AllTabContents />
      }
    ];

    categories.forEach((category) => {
      const categoryContent = CATEGORY_MAP[category.name] || {};
      const name = categoryContent.displayName || category.name;

      let icon;

      if (category.hasIcon) {
        icon = {
          type: 'link',
          arguments: {
            url: MyMarketApi.getCategoryIcon(category.name)
          }
        };
      } else if (categoryContent.displayName) {
        icon = {
          type: 'font-icon',
          arguments: {
            data: categoryContent.icon
          }
        };
      } else {
        icon = {
          type: 'font-icon',
          arguments: {
            data: `icon-${category.name[0].toUpperCase()}`
          }
        };
      }

      const config = {
        id: category.name,
        filter: category.name,
        name,
        icon,
        content: category.name === 'usecase' ? <UsecaseTab /> : <AllTabContents />
      };

      tabs.push(config);
    });

    tabConfig.tabs = tabs;
    return tabConfig;
  }

  handleTabClick(id) {
    let searchFilter = find(this.state.tabConfig.tabs, { id }).filter;

    this.setState({ activeTab: id });
    MarketAction.setFilter(searchFilter);
  }

  render() {
    if (!this.state.tabConfig) { return null; }

    return (
      <ConfigurableTab
        tabConfig={this.state.tabConfig}
        onTabClick={this.handleTabClick.bind(this)}
        activeTab={this.state.activeTab}
      />
    );
  }
}
