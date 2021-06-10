---
title: "RemoveOrphanedSysStorageAliases"
id: "removeorphanedsysstoragealiases"
---

API Name: global.RemoveOrphanedSysStorageAliases

```js

var RemoveOrphanedSysStorageAliases = Class.create();
RemoveOrphanedSysStorageAliases.prototype = {

    type: 'RemoveOrphanedSysStorageAliases',

    compareStorageAliasesToSysDictionary: function() {
        var grSysStorageAlias = new GlideRecord('sys_storage_alias');
        grSysStorageAlias.addEncodedQuery("offrow_storage=false^ORoffrow_storageISEMPTY");
        grSysStorageAlias.orderBy('table_name');
        grSysStorageAlias.query();

        while(grSysStorageAlias.next()) {

            var tableName = String(grSysStorageAlias.table_name);
            var element = String(grSysStorageAlias.element_name);
            var exists = GlideTableDescriptor.fieldExists(tableName, element);
            if (this._tableIsIgnored(tableName) || this._elementIsIgnored(element) || exists)
                continue;

            var parentTableNames = GlideDBObjectManager.getTables(tableName);
            this._removeStorageAliasIfOrphaned(parentTableNames, element, grSysStorageAlias);
        }
    },
    _removeStorageAliasIfOrphaned: function(parentTableNames, element, grSysStorageAlias) {
        var grSysDictionary = new GlideRecord('sys_dictionary');
        grSysDictionary.addQuery('name', parentTableNames);
        grSysDictionary.addQuery('element', element);
        grSysDictionary.query();

        if (!grSysDictionary.next()) {
            gs.info("Removing orphaned sys_storage_alias: "
                + " table_name: " + grSysStorageAlias.table_name + " | element_name: " + grSysStorageAlias.element_name
                + " | storage_table_name " + grSysStorageAlias.storage_table_name + " | storage_alias: " + grSysStorageAlias.storage_alias
                + " | sys_id: " + grSysStorageAlias.sys_id);
            grSysStorageAlias.deleteRecord();
        }
    },
    _tableIsIgnored: function(tableName) {
        return this._startsWith(tableName, 'b_', 2) ||
            this._startsWith(tableName, 'z_', 2) ||
            this._isOffrow(tableName) ||
            this._startsWith(tableName, 'sys_', 4) ||
            tableName.contains('$par');
    },
    _elementIsIgnored: function(element) {
        var sysFieldsToIgnore = ['sys_created_by', 'sys_created_on', 'sys_mod_count', 'sys_updated_by', 'sys_updated_on'];
        return this._contains(sysFieldsToIgnore, element);
    },
    _startsWith: function(str, prefix, prefixLength) {
        return str.substring(0, prefixLength) === prefix;
    },
    _isOffrow: function(str) {
        if (str.length > 9)
            return str.substr(str.length-7, 7) === '_offrow';
        else
            return false;
    },
    _contains: function(arr, str) {
        if (arr && str) {
            for (var i=0; i<arr.length; i++) {
                if (arr[i] === str)
                    return true;
            }
        }
        return false;
    }
};
```