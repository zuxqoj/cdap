/*
 * Copyright © 2018 Cask Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
*/

const username = Cypress.env('username') || 'admin';
const password = Cypress.env('password') || 'admin';
let isAuthEnabled = false;
let authToken = null;
let sessionToken = null;

function loginIfRequired() {
  if (isAuthEnabled && authToken !== null) {
    cy.setCookie('CDAP_Auth_Token', authToken);
    cy.setCookie('CDAP_Auth_User', username);
    Cypress.Cookies.defaults({
      whitelist: ['CDAP_Auth_Token', 'CDAP_Auth_User'],
    });
    return;
  }
  return cy
    .request({
      method: 'GET',
      url: `http://${Cypress.env('host')}:11015/v3/namespaces`,
      failOnStatusCode: false,
    })
    .then((response) => {
      // only login when ping request returns 401
      if (response.status === 401) {
        isAuthEnabled = true;
        cy.request({
          method: 'POST',
          url: '/login',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
          }),
        }).then((res) => {
          const respBody = JSON.parse(res.body);
          authToken = respBody.access_token;
          cy.setCookie('CDAP_Auth_Token', respBody.access_token);
          cy.setCookie('CDAP_Auth_User', username);
          Cypress.Cookies.defaults({
            whitelist: ['CDAP_Auth_Token', 'CDAP_Auth_User'],
          });
        });
      }
    });
}

function getSessionToken(headers) {
  if (sessionToken !== null) {
    return sessionToken;
  }
  return cy.request({
    method: 'GET',
    url: `http://${Cypress.env('host')}:11011/sessionToken`,
    failOnStatusCode: false,
    headers,
  }).then(response => {
    sessionToken = response.body;
    return sessionToken;
  });
}

function getArtifactsPoll(headers, retries = 0) {
  if (retries === 3) {
    return;
  }
  cy.request({
    method: 'GET',
    url: `http://${Cypress.env('host')}:11015/v3/namespaces/default/artifacts?scope=SYSTEM`,
    failOnStatusCode: false,
    headers,
  }).then((response) => {
    if (response.status >= 400) {
      return getArtifactsPoll(headers, retries + 1);
    }
    return;
  });
}

function deployAndTestPipeline(filename, pipelineName, done) {
  cy.visit('/cdap/ns/default/pipelines');
  cy.get('#resource-center-btn').click();
  cy.get('#create-pipeline-link').click();
  cy.url().should('include', '/studio');
  cy.upload_pipeline(filename, '#pipeline-import-config-link > input[type="file"]');
  // This is arbitrary. Right now we don't have a way to determine
  // if the upgrade check is done. Since this a standalone the assumption
  // is this won't take more than 10 seconds.
  cy.wait(10000);
  // Name pipeline then deploy pipeline
  cy.get('.pipeline-name').click();
  cy.get('#pipeline-name-input')
    .clear()
    .type(pipelineName)
    .type('{enter}');
  cy.get('[data-testid=deploy-pipeline]').click();
  cy.wait(10000);
  cy.url()
    .should('include', `/view/${pipelineName}`)
    .then(() => done());
}

function getGenericEndpoint(options, id) { return `.plugin-endpoint_${id}-right` }

function getConditionNodeEndpoint(options, id) { return `.plugin-endpoint_${id}_condition_${options.condition}` }

export {
  loginIfRequired,
  getArtifactsPoll,
  deployAndTestPipeline,
  getSessionToken,
  getGenericEndpoint,
  getConditionNodeEndpoint
};
