---
title: "UserCriteriaDiagnosticsUtil"
id: "usercriteriadiagnosticsutil"
---

API Name: global.UserCriteriaDiagnosticsUtil

```js
function UserCriteriaDiagnosticsUtil(request, response, processor) {
    var uclist;
    var itemId;
    var userId;
    var CATALOG = 'catalog';
    var CATALOG_ITEM = 'catalog_item';
    var CATEGORY = 'category';

    function _fetchUserCriteriaData() {
        var matches;
        var idNameMap = {};
        var results = [];
        var isCatalogItem = "" + request.getParameter("sysparm_isCatalogItem");
        var mToMTableName = 'sc_cat_item_user_criteria_mtom';
        var noMToMTableName = 'sc_cat_item_user_criteria_no_mtom';
        var columnName = 'sc_cat_item';
        if (isCatalogItem === 'false') {
            mToMTableName = 'sc_category_user_criteria_mtom';
            noMToMTableName = 'sc_category_user_criteria_no_mtom';
            columnName = 'sc_category';
        }
        var itemIncludedCriteria = _fetchAssociation(mToMTableName, columnName, itemId);
        var itemNotIncludedCriteria = _fetchAssociation(noMToMTableName, columnName, itemId);
        var matchingAvailableUC = SNC.UserCriteriaLoader.getMatchingCriteria(userId, itemIncludedCriteria);
        var matchingNotAvailableUC = SNC.UserCriteriaLoader.getMatchingCriteria(userId, itemNotIncludedCriteria);

        idNameMap = _getUserCriteriaNameMap(itemIncludedCriteria.concat(itemNotIncludedCriteria));
        for (var i = 0; i < itemNotIncludedCriteria.length; i++) {
            matches = matchingNotAvailableUC.indexOf(itemNotIncludedCriteria[i]) !== -1;
            results.push({
                type: "Not Available",
                uc: itemNotIncludedCriteria[i],
                matches: matches,
                name: idNameMap[itemNotIncludedCriteria[i]]
            });
        }
        for (i = 0; i < itemIncludedCriteria.length; i++) {
            matches = matchingAvailableUC.indexOf(itemIncludedCriteria[i]) !== -1;
            results.push({
                type: "Available",
                uc: itemIncludedCriteria[i],
                matches: matches,
                name: idNameMap[itemIncludedCriteria[i]]
            });
        }

        return results;
    }

    function _fetchAssociation(tableName, column, id) {
        var items = [];
        var gr = new GlideRecord(tableName);
        gr.addActiveQuery();
        gr.addQuery(column, id);
        gr.addNotNullQuery('user_criteria');
        gr.addNotNullQuery(column);
        gr.query();
        while (gr.next()) {
            items.push(gr.getValue('user_criteria'));
        }
        return items;
    }

    function _getUserCriteriaNameMap(ids) {
        var idNameMap = {};
        var criteriaGr = new GlideRecord('user_criteria');
        criteriaGr.addQuery("sys_id", "IN", ids);
        criteriaGr.query();
        while (criteriaGr.next()) {
            idNameMap[criteriaGr.getValue("sys_id")] = criteriaGr.getValue("name");
        }
        return idNameMap;
    }

    function _getAndParseData(itemId, userId) {
        var catItem = new sn_sc.CatItem(itemId);
        var itemDetails = catItem.getItemSummary();
        var itemCatalogs = itemDetails.catalogs;
        var i = 0,
            j, itemCategories = [];
        var children;
        var categoryObject, catalog, categoryTree;
        var allChildren = [];

        while (i < itemCatalogs.length) {
            itemDetails.categories = [];
            // Add catalog in tree
            children = [{
                name: itemCatalogs[i].title,
                sys_id: itemCatalogs[i].sys_id,
                active: itemCatalogs[i].active,
                type: CATALOG,
                viewable: itemCatalogs[i].active
            }];

            itemCategories = [];
            var gr = new GlideRecord("sc_cat_item_category");
            gr.addQuery("sc_cat_item", itemId);
            gr.addQuery("sc_category.sc_catalog", itemCatalogs[i].sys_id);
            gr.query();
            while (gr.next()) {
                itemCategories.push(gr.getValue("sc_category"));
            }
            j = 0;
            while (j < itemCategories.length) {
                categoryTree = catItem.getCategoryTree(itemCategories[j]);
                categoryObject = new sn_sc.CatCategory(categoryTree.sys_id);
                catalog = categoryObject.getCatalog();

                if (catalog === itemCatalogs[i].sys_id) {
                    itemDetails.categories.push(categoryTree);
                }
                j++;
            }
            allChildren = allChildren.concat(_getAllChildren(itemDetails.categories, children));
            i++;
        }

        // Add catalog item at the top of tree
        return {
            name: itemDetails.name,
            sys_id: itemDetails.sys_id,
            children: allChildren,
            type: CATALOG_ITEM,
            viewable: _viewable(itemDetails.sys_id, userId, CATALOG_ITEM)
        };
    }

    function _getAllChildren(categories, children) {
        var categoryQueue = [];
        var allCategories = [];
        var node;

        // Add categories
        categories.forEach(function(category) {
            var tempNode, childCategory;
            node = {
                name: category.title,
                sys_id: category.sys_id,
                active: category.active,
                children: children,
                type: CATEGORY,
                viewable: _viewable(category.sys_id, userId, CATEGORY)
            };

            if (category.category && Object.keys(category.category).length) {
                categoryQueue.push(category.category);
            }

            while (categoryQueue.length) {
                tempNode = {};
                childCategory = categoryQueue.pop();
                tempNode = {
                    name: childCategory.title,
                    sys_id: childCategory.sys_id,
                    active: childCategory.active,
                    children: [],
                    type: CATEGORY,
                    viewable: _viewable(childCategory.sys_id, userId, CATEGORY)
                };
                tempNode.children.push(node);
                node = tempNode;
                if (childCategory.category && Object.keys(childCategory.category).length) {
                    categoryQueue.push(childCategory.category);
                }
            }
            allCategories.push(node);
        });

        return allCategories;
    }

    function _viewable(id, userId, type) {
        var value, resource;
        switch (type) {
            case CATALOG_ITEM:
                resource = GlideappCatalogItem.get(id);
                return resource.canViewCheck(false, false, user);

            case CATEGORY:
                resource = GlideappCategory.get(id);
                value = resource.canView(false, false, false, user, false);
                return value;

            case CATALOG:
                resource = GlideappCatalog.get(id);
                return resource.canView(false, false, user);
        }
    }

    function _getData(user) {
        return {
            treeData: _getAndParseData(itemId, userId),
            userName: user.getDisplayName()
        };
    }

    function _isUserAuthorised() {
        return gs.hasRole('catalog_admin') || gs.hasRole('catalog_manager');
    }

    function methodToExecute() {
        if (!_isUserAuthorised())
            return;

        var initialLoad = "" + request.getParameter("sysparm_initialLoad");
        var resultJson = {};

        userId = "" + request.getParameter("sysparm_userId");
        itemId = "" + request.getParameter("sysparm_itemId");
        if (initialLoad === 'true') {
            user = GlideUser.getUserByID(userId);
            resultJson.ucData = _getData(user);
        }
        resultJson.userCriteria = _fetchUserCriteriaData();
        processor.writeOutput("application/json", new JSON().encode(resultJson));
    }

    return {
        execute: methodToExecute
    };
}
```