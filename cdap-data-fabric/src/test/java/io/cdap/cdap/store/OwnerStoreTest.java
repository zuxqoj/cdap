/*
 * Copyright © 2017-2019 Cask Data, Inc.
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

package io.cdap.cdap.store;

import io.cdap.cdap.common.AlreadyExistsException;
import io.cdap.cdap.proto.id.DatasetId;
import io.cdap.cdap.proto.id.KerberosPrincipalId;
import io.cdap.cdap.proto.id.NamespaceId;
import io.cdap.cdap.security.impersonation.OwnerStore;
import org.junit.Assert;
import org.junit.Test;

/**
 * Tests for {@link OwnerStore}.
 */
public abstract class OwnerStoreTest {

  public abstract OwnerStore getOwnerStore();

  @Test
  public void test() throws Exception {
    OwnerStore ownerStore = getOwnerStore();
    DatasetId datasetId = NamespaceId.DEFAULT.dataset("fooData");

    // No owner info should exist for above stream
    Assert.assertNull(ownerStore.getOwner(datasetId));

    // delete behavior is idempotent, so won't throw NotFoundException
    ownerStore.delete(datasetId);

    // Storing an owner for the first time should work
    KerberosPrincipalId kerberosPrincipalId = new KerberosPrincipalId("alice/somehost@SOMEKDC.NET");
    ownerStore.add(datasetId, kerberosPrincipalId);

    // owner principal should exists
    Assert.assertTrue(ownerStore.exists(datasetId));

    // Should be able to get the principal back
    Assert.assertEquals(kerberosPrincipalId, ownerStore.getOwner(datasetId));

    // Should not be able to update the owner principal
    try {
      ownerStore.add(datasetId, new KerberosPrincipalId("bob@SOMEKDC.NET"));
      Assert.fail();
    } catch (AlreadyExistsException e) {
      // expected
    }

    // Should not be able to update the owner principal
    try {
      ownerStore.add(datasetId, new KerberosPrincipalId("somePrincipal"));
      Assert.fail();
    } catch (AlreadyExistsException e) {
      // expected
    }

    // trying to update with invalid principal should fail early on with IllegalArgumentException
    try {
      ownerStore.add(datasetId, new KerberosPrincipalId("b@ob@SOMEKDC.NET"));
      Assert.fail();
    } catch (IllegalArgumentException e) {
      // expected
    }

    // Trying to store owner information for unsupported type should fail
    try {
      ownerStore.add(NamespaceId.DEFAULT.topic("anotherStream"), new KerberosPrincipalId("somePrincipal"));
      Assert.fail();
    } catch (IllegalArgumentException e) {
      // expected
    }

    // delete the owner information
    ownerStore.delete(datasetId);
    Assert.assertFalse(ownerStore.exists(datasetId));
    Assert.assertNull(ownerStore.getOwner(datasetId));
  }
}
