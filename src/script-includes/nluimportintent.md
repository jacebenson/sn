---
title: "NLUImportIntent"
id: "nluimportintent"
---

API Name: global.NLUImportIntent

```js
var NLUImportIntent = Class.create();
(function () {
    NLUImportIntent.prototype = {
        type: 'NLUImportIntent',

        initialize: function () {
            this.nluUtil = new global.NLUUtil();
        },

        importIntent: function (intents, modelId) {
            var _this = this;
            var result = {};
            try {
                var entityMap = {};
                var scopeId = this.nluUtil.getModelScope(modelId);
                var intentArr = this.getIntentEntityUtterance(intents);
                intentArr.forEach(function (i) {
                    _this.copyIntent(i, entityMap, modelId, scopeId);
                });
                result.status = 'success';
                result.message = gs.getMessage('Import Successful');
            } catch (e) {
                result.status = 'failure';
                result.message = e.message;
            }
            return result;
        },

        copyIntent: function (intent, entityMap, modelId, scopeId) {
            var _this = this;
            intent.model = modelId;
            intent.sys_scope = scopeId;
            var intentId = this.nluUtil.copyRecord('sys_nlu_intent', ['name', 'description', 'model', 'sys_scope'], intent);
            if (intentId) {
                intent.entities.forEach(function (e) {
                    var entityId = entityMap[e.name];
                    if (!entityId) {
                        entityId = _this.copyEntity(e, modelId, scopeId);
                        if (!entityId) return;
                        entityMap[e.name] = entityId;
                    }
                    _this.nluUtil.copyRecord('m2m_sys_nlu_intent_entity', ['entity', 'intent', 'sys_scope'], {
                        entity: entityId,
                        intent: intentId,
                        sys_scope: scopeId
                    });
                });

                intent.utterances.forEach(function (u) {
                    _this.copyUtterance(u, intentId, entityMap, scopeId);
                });
            }
        },

        copyEntity: function (entity, modelId, scopeId) {
            entity.sys_scope = scopeId;
            var fields = ['name', 'type', 'table', 'field_name', 'values_list', 'base_entity', 'sys_scope'];
            return this.nluUtil.copyRecord('sys_nlu_entity', fields, entity);
        },

        copyUtterance: function (utterance, intentId, entityMap, scopeId) {
            var _this = this;
            utterance.intent = intentId;
            utterance.sys_scope = scopeId;
            var utteranceId = this.nluUtil.copyRecord('sys_nlu_utterance', ['utterance', 'intent', 'sys_scope'], utterance);
            if (utteranceId) {
                utterance.annotations.forEach(function (a) {
                    _this.nluUtil.copyRecord('m2m_sys_nlu_utterance_entity', ['utterance', 'entity', 'annotation', 'sys_scope'], {
                        utterance: utteranceId,
                        entity: entityMap[a.entityName],
                        annotation: a.annotation,
                        sys_scope: scopeId
                    });
                });
            }
        },

        addAnnotations: function (utteranceIds, utteranceMap) {
            var annotationGr = new GlideRecord('m2m_sys_nlu_utterance_entity');
            annotationGr.addQuery('utterance', 'IN', utteranceIds);

            annotationGr.query();
            while (annotationGr.next()) {
                var utteranceId = annotationGr.getValue('utterance');
                var uttObj = utteranceMap[utteranceId];
                uttObj.annotations.push({
                    entityName: annotationGr.entity.name.toString(),
                    annotation: annotationGr.getValue('annotation')
                });
            }
        },

        getUtterances: function (intentIds) {
            var utteranceIds = [];
            var utteranceMap = {};
            var intentUtteranceMap = {};

            var utteranceGR = new GlideRecord('sys_nlu_utterance');
            utteranceGR.addQuery('intent', 'IN', intentIds);

            utteranceGR.query();
            while (utteranceGR.next()) {
                var sysId = utteranceGR.getUniqueValue();
                var intentId = utteranceGR.getValue('intent');
                var uttObj = {
                    annotations: [],
                    utterance: utteranceGR.getValue('utterance')
                };
                var arr = intentUtteranceMap[intentId];
                if (!arr) {
                    arr = [];
                    intentUtteranceMap[intentId] = arr;
                }
                arr.push(uttObj);
                utteranceMap[sysId] = uttObj;
                utteranceIds.push(sysId);
            }
            this.addAnnotations(utteranceIds, utteranceMap);
            return intentUtteranceMap;
        },

        getEntities: function (intentIds) {
            var intentEntityMap = {};
            var gr = new GlideRecord('m2m_sys_nlu_intent_entity');
            gr.addJoinQuery('sys_nlu_entity', 'entity', 'sys_id');
            gr.addQuery('intent', 'IN', intentIds);
            gr.query();
            while (gr.next()) {
                var intentId = gr.getValue('intent');
                var entityRec = gr.entity.getRefRecord();
                var name = entityRec.getValue('name');
                var entity = {
                    name: name,
                    type: entityRec.getValue('type'),
                    table: entityRec.getValue('table'),
                    field_name: entityRec.getValue('field_name'),
                    values_list: entityRec.getValue('values_list'),
                    base_entity: entityRec.getValue('base_entity'),
                    _intentId: intentId
                };

                var arr = intentEntityMap[intentId];
                if (!arr) {
                    arr = [];
                    intentEntityMap[intentId] = arr;
                }
                arr.push(entity);
            }
            return intentEntityMap;
        },

        getIntentEntityUtterance: function (intentIds) {
            var intents = [];
            var intentUtteranceMap = this.getUtterances(intentIds);
            var intentEntityMap = this.getEntities(intentIds);

            var intentGr = new GlideRecord('sys_nlu_intent');
            intentGr.addQuery('sys_id', intentIds);
            intentGr.query();
            while (intentGr.next()) {
                var i = {};
                var sysId = intentGr.getUniqueValue();
                i.name = intentGr.getValue('name');
                i.description = intentGr.getValue('description');
                i.entities = intentEntityMap[sysId];
                i.utterances = intentUtteranceMap[sysId];
                intents.push(i);
            }
            return intents;
        }
    };
})();
```