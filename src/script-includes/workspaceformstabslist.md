---
title: "WorkspaceFormsTabsList"
id: "workspaceformstabslist"
---

API Name: global.WorkspaceFormsTabsList

```js
var WorkspaceFormsTabsList = Class.create();
WorkspaceFormsTabsList.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    _getStatic: function() {
        var label = "Details";
        return this._getChoiceListFromArray([{
            label: label,
            value: label
        }]);
    },
    _getRelatedItem: function(table, view, workspace) {
        var list = [];
        var currentAction = '';
        var prevAction = '';
        var model = '360935e9534723003eddddeeff7b127d';
        var position = 'related_item';
        var gr = new GlideRecord('sys_declarative_action_assignment');
        var tables = GlideDBObjectManager.getTables(table);

        var qcTable = gr.addQuery('table', table);
        qcTable.addOrCondition('table', 'IN', tables);
        qcTable.addOrCondition('table', "global");

        var qcView = gr.addQuery('view', view);
        qcView.addOrCondition('view', null);

        var qcWorkspace = gr.addQuery('workspace', workspace);
        qcWorkspace.addOrCondition('workspace', null);

        gr.addQuery("form_position", position);
        gr.addQuery("model", model);
        gr.orderBy("action_name");
        gr.orderByDesc("specificity");
        gr.orderBy("order");
        gr.query();

        while (gr.next()) {
            currentAction = gr.getValue('action_name');
            if (currentAction !== prevAction && this._userHasRoles(gr)) {
                list.push({
                    label: gr.getDisplayValue("label"),
                    value: gr.getUniqueValue()
                });
            }
            prevAction = currentAction;
        }
        return this._getChoiceListFromArray(list);
    },
    _getRelatedList: function(table, view) {
        return new GlideRelatedList(table, view).getRelatedListBucket(false);
    },
    _getChoiceListFromArray: function(arr) {
        var choiceList = new GlideChoiceList();
        arr.forEach(function(item) {
            choiceList.add(new GlideChoice(item.value, item.label));
        });
        return choiceList;
    },
    _userHasRoles: function(gr) {
        var rolesRequired = gr.getDisplayValue("required_roles");
        return GlideSecurityManager.get().hasRole(rolesRequired);
    },

    _addTab: function(label, value) {
        var tabItem = this.newItem("item");
        tabItem.setAttribute("label", label);
        tabItem.setAttribute("value", value);
    },
    getList: function(table, view, workspace) {
        var choiceList = new GlideChoiceList();
        choiceList.addAll(this._getStatic());
        choiceList.addAll(this._getRelatedList(table, view));
        choiceList.addAll(this._getRelatedItem(table, view, workspace));
        return choiceList;
    },
    getListArray: function(table, view, workspace) {
        var list = [];
        var choiceList = this.getList(table, view, workspace);
        for (var j = 0; j < choiceList.getSize(); j++) {
            var choice = choiceList.getChoice(j);
            list.push({
                label: choice.getLabel(),
                value: choice.getValue()
            });
        }
        return list;
    },
    getListAjax: function() {
        // E.G. arguments
        // 'table': "incident"
        // 'view': "Default view"
        // 'workspace': "7b24ceae5304130084acddeeff7b12a3"

        var table = this.getParameter('sysparm_table');
        var view = this.getParameter('sysparm_view');
        var workspace = this.getParameter('sysparm_workspace');
        var choiceList = this.getList(table, view, workspace);

        for (var j = 0; j < choiceList.getSize(); j++) {
            var choice = choiceList.getChoice(j);
            this._addTab(choice.getLabel(), choice.getValue());
        }
    },
    type: 'WorkspaceFormsTabsList'
});
```