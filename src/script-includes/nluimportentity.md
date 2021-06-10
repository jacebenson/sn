---
title: "NLUImportEntity"
id: "nluimportentity"
---

API Name: global.NLUImportEntity

```js
var NLUImportEntity = Class.create();
NLUImportEntity.prototype = {
    type: 'NLUImportEntity',
    initialize: function () {
        this.nluUtil = new global.NLUUtil();
    },
    importEntity: function (entities, modelId) {
        var result = {};
        var _this = this;
        try {
            var fields = ['name', 'type', 'table', 'field_name', 'values_list', 'base_entity'];
            var scopeId = this.nluUtil.getModelScope(modelId);
            var entityList = this.getEntities(entities, fields);
            fields.push('sys_scope');
            fields.push('model');
            entityList.forEach(function (e) {
                e.sys_scope = scopeId;
                e.model = modelId;
                _this.nluUtil.copyRecord('sys_nlu_entity', fields, e);
            });
            result.status = 'success';
            result.message = gs.getMessage('Import Successful');
        } catch (e) {
            result.status = 'failure';
            result.message = e.message;
        }
        return result;
    },
    getEntities: function (entities, fields) {
        var result = [];
        var gr = new GlideRecord('sys_nlu_entity');
        gr.addQuery('sys_id', 'IN', entities);
        gr.query();
        while (gr.next()) {
            var en = this.nluUtil.getObjectFromGR(gr, fields);
            result.push(en);
        }
        return result;
    }
};
```