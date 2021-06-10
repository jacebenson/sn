---
title: "NLUCloneModel"
id: "nluclonemodel"
---

API Name: global.NLUCloneModel

```js
var NLUCloneModel = Class.create();
(function() {
    NLUCloneModel.prototype = {

        type: 'NLUCloneModel',
        copyNameSuffix: ' Copy',
        suffixRegex: /( Copy)([0-9]+)$/,

        initialize: function() {
            this.nluUtil = new global.NLUUtil();
            this.importUtil = new global.NLUImportIntent();
        },

        clone: function(sysId, opts) {
            var model;
            var result = {};
            try {
                var sessionScopeId = gs.getCurrentApplicationId();
                if (!this.checkScope(sessionScopeId)) {
                    throw new Error(gs.getMessage('Cannot clone model to the current scope. Please select a valid application scope.'));
                }
                if (opts != null) {
                    if (opts.display_name == null)
                        throw new Error(gs.getMessage('Invalid data'));
                    model = opts;
                } else {
                    model = this.getModelById(sysId);
                    model.display_name = this.getAUniqueName(model.display_name, sessionScopeId);
                }
                if (model.sys_scope == null)
                    model.sys_scope = sessionScopeId;

                var modelId = this.createModel(model);
                this.copySysEntityState(sysId, modelId);
                this.copyVocabulary(sysId, modelId);
                this.importUtil.importIntent(this.getIntentIds(sysId), modelId);

                result.status = 'success';
                result.message = gs.getMessage('The model has been successfully cloned.');
            } catch (e) {
                result.status = 'failure';
                result.message = e.message;
            }
            return result;
        },

        getModelById: function(sysId) {
            var gr = new GlideRecord('sys_nlu_model');
            var model = {};
            if (gr.get(sysId)) {
                model = this.nluUtil.getObjectFromGR(gr, ['display_name', 'description', 'confidence_threshold', 'language']);
            } else {
                throw new Error(gs.getMessage('Model id does not exist'));
            }
            return model;
        },

        trimSuffixIfPresent: function(modelName) {
            var pos = modelName.search(this.suffixRegex);
            if (pos > -1) {
                return modelName.substring(0, pos);
            }
            return modelName;
        },

        getAUniqueName: function(modelName, sys_scope) {
            var name = this.trimSuffixIfPresent(modelName);
            var gr = new GlideRecord('sys_nlu_model');
            gr.addQuery('display_name', 'LIKE', name + this.copyNameSuffix + '%');
            gr.addQuery('sys_scope', sys_scope);
            gr.query();
            var sequence = 0;
            while (gr.next()) {
                var n = gr.display_name;
                if (this.suffixRegex.test(n)) {
                    var num = parseInt(n.match(this.suffixRegex)[2]);
                    if (num > sequence)
                        sequence = num;
                }
            }
            return this.getCloneModelName(name, sequence, sys_scope);
        },

        getCloneModelName: function(name, sequence, sys_scope) {
            var cloneModelName;
            sequence++;
            if (this.suffixRegex.test(name)) {
                cloneModelName = name.replace(this.suffixRegex, function(match, p1) {
                    return p1 + sequence;
                });
            } else {
                cloneModelName = name + this.copyNameSuffix + sequence;
            }
            return (cloneModelName.length <= 40 ? cloneModelName : this.trimModelName(cloneModelName, sys_scope));
        },

        trimModelName: function(modelName, sys_scope) {
            var trimLength = modelName.length - 40;
            var pos = modelName.search(this.suffixRegex);
            if (trimLength > 0) {
                var name = modelName.substring(0, pos - trimLength) + modelName.substring(pos);
                var gr = new GlideRecord('sys_nlu_model');
                gr.addQuery('display_name', name);
                gr.addQuery('sys_scope', sys_scope);
                gr.query();

                if (gr.next()) {
                     return this.getAUniqueName(name, sys_scope);
                }
                return name;
            }
            return modelName;
        },

        createModel: function(modelProps) {
            var fields = ['display_name', 'description', 'confidence_threshold', 'sys_scope', 'language'];
            return this.nluUtil.copyRecord('sys_nlu_model', fields, modelProps);
        },

        copyVocabulary: function(sourceModelId, targetModelId) {
            var fields = ['name', 'type', 'pattern', 'related_terms', 'model'];
            var gr = new GlideRecord('sys_nlu_vocabulary');
            gr.addQuery('model', sourceModelId);
            gr.query();
            while (gr.next()) {
                var vocabulary = this.nluUtil.getObjectFromGR(gr, fields);
                vocabulary.model = targetModelId;
                this.nluUtil.copyRecord('sys_nlu_vocabulary', fields, vocabulary);
            }
        },

        getIntentIds: function(modelId) {
            var gr = new GlideRecord('sys_nlu_intent');
            gr.addQuery('model', modelId);
            gr.query();
            var intentIds = [];
            while (gr.next()) {
                intentIds.push(gr.getUniqueValue());
            }
            return intentIds;
        },

        copySysEntityState: function(sourceModelId, targetModelId) {
            var gr = new GlideRecord('m2m_sys_nlu_model_sys_entity');
            gr.addQuery('model', targetModelId);
            var jq = gr.addJoinQuery('m2m_sys_nlu_model_sys_entity', 'sys_entity', 'sys_entity');
            jq.addCondition('model', sourceModelId);
            jq.addCondition('active', false);
            gr.query();
            while (gr.next()) {
                gr.setValue('active', false);
                gr.update();
            }
        },

        checkScope: function(scopeId) {
            var gr = new GlideRecord('sys_app');
            if (gr.get(scopeId)) return true;

            gr = new GlideRecord('sys_store_app');
            return (gr.get(scopeId) &&
				gr.isValidField('can_edit_in_studio') &&
				gr.getValue('can_edit_in_studio') == 1);
        }

    };
})();
```