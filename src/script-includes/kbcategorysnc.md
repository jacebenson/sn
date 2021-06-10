---
title: "KBCategorySNC"
id: "kbcategorysnc"
---

API Name: global.KBCategorySNC

```js
KBCategorySNC = Class.create();

KBCategorySNC.prototype = Object.extendsObject(KBCommon, {

	vCATEGORIES_LIST: [],
	vCATEGORY_CHILD_MAP: "",
	vKNOWLEDGE_QUERY: "",
	vFILTERED_CATEGORY_LIST: [],

	/**
     * If the user is a owner/ manager of the KB 
     * they should be able to create a category.
     *
     * @param String: kb_category sys_id
     * @return Boolean: can logged in user create a category
     */
	canCreate: function(categoryId) {
		return this.canManageCategory(categoryId);
	},

	/**
     * Every user should be able to read all categories.
     *
     * @param String: kb_category sys_id
     * @return Boolean: can logged in user read the category
     */
	canRead: function(categoryId) {
		return this.canReadRootKnowledgeBase(categoryId);
	},

	/**
     * Providing user is an owner/ manager of the
     * corresponding kb_knowledge_base let them update the record.
     *
     * @param String: kb_category sys_id
     * @return Boolean: can logged in user update the category
     */
	canWrite: function(categoryId) {
		return this.canManageCategory(categoryId);
	},

	/**
     * Only owner/ manager can delete empty categories.
     *
     * @param String: kb_category sys_id
     * @return Boolean: can logged in user delete the category
     */
	canDelete: function(categoryId) {
		return this.managerRightToKnowledgeCategory(categoryId) && this.isEmptyCategory(categoryId);
	},

	/**
     * Only owner/ manager of a KB can activate/dectivate a category.
     *
     * @param String: kb_category sys_id
     * @return Boolean: can logged in user activate/deactivate the category
     */
	canActivate: function(categoryId) {
		return this.canManageCategory(categoryId);
	},

	/**
     * Knowledge Contributor, Manager, Admins can manage category.
     * @param String: kb_category parent_id
     * @return Boolean: can logged in user manage the category
     */
	canManageCategory: function(parentId) {
		if(!gs.nil(parentId)) {
			var kbId = this._knowledgeHelper.getRootKBId(parentId);
			var kbGR = new GlideRecord('kb_knowledge_base');
			
			if(kbGR.get(kbId)) {
				if(this.isKnowledgeBaseManager(kbGR, 'kb_managers') || this.isKnowledgeBaseOwner(kbGR, 'owner')|| this.isAdminUser(kbGR))
					return true;
				else if(!kbGR.disable_category_editing)
					return this.safeExecute(this._knowledgeHelper.canContribute, kbGR);
				else 
					return false;
			} 
		}
		
		return this.isAdminUser(null);
	},

	/**
     * Filter categories which contains accessible articles
     * @param Array: kb_category sys_ids
     * @param String: Encoded Query to run against knowledge articles
     * @return Array: kb_category sys_ids having articles
     */
	filterCategoriesWithArticle: function(categories, knowledgeQuery) {
		this.vCATEGORIES_LIST = categories || [];
		this.vKNOWLEDGE_QUERY = knowledgeQuery || new global.KBKnowledge().getKnowledgeEncodedQuery() || "";
		var childMap = {};

		//Built Category map
		this.vCATEGORIES_LIST.forEach(function(val) {
			childMap[val + ''] = [];
		});

		this.vCATEGORY_CHILD_MAP = JSON.stringify(childMap);
		this.filterCategoriesWithArticleInHierarchy(this.vCATEGORIES_LIST);

		return this.vFILTERED_CATEGORY_LIST;
	},

	/**
     * Filter categories which contains any accessible articles accross whole heirarchy tree
     */
	filterCategoriesWithArticleInHierarchy: function(categories) {
		//If there are categories to filter
		if (this.vCATEGORIES_LIST && this.vCATEGORIES_LIST.length) {

			//filter categories having direct article associated
			var filteredCategories = this.filterCateoriesWithDirectArticles(categories);

			//Get child categories for remaining categories 
			if(filteredCategories.length){
				var childCategories = this.getChildCateories(filteredCategories);

				//Filter remaing parent based on child categories
				if(childCategories.length)
					this.filterCategoriesWithArticleInHierarchy(childCategories);
			}
		}
	},

	/**
     * Get child categories which contains accessible articles in them directly
     */
	getChildCateories: function(categories) {
		var catList = [];
		var catWithChild = [];
		var childMap = JSON.parse(this.vCATEGORY_CHILD_MAP);
		var cat = new GlideRecord("kb_category");
		cat.addQuery('parent_id', 'IN', categories.join());
		cat.addActiveQuery();
		cat.query();
		while (cat.next()) {
			var catChild = cat.getValue('sys_id') + '';
			var catParent = cat.getValue('parent_id') + '';
			var rootParent = this._getRootParent(catParent);

			catList.push(catChild);
			childMap[rootParent].push(catChild);
			this.vCATEGORY_CHILD_MAP = JSON.stringify(childMap);

			if (catWithChild.indexOf(rootParent) == -1)
				catWithChild.push(rootParent);
		}

		//Remove categores with no child
		this.vCATEGORIES_LIST = catWithChild;

		return catList;
	},

	/**
     * Filter categories which contains accessible articles in them directly
     * @param Array: All kb_category List
     * @return Array: kb_category ids having articles
     */
	filterCateoriesWithDirectArticles: function(categories) {

		var catList = [];
		var kb = new GlideAggregate("kb_knowledge");
		kb.addQuery("kb_category", "IN", categories.join());
		if (this.vKNOWLEDGE_QUERY)
			kb.addEncodedQuery(this.vKNOWLEDGE_QUERY);
		kb.groupBy('kb_category');
		kb.query();
		while (kb.next()) {

			if(this.vCATEGORIES_LIST.length == 0)
				break;

			var childCat = kb.getValue('kb_category') + '';
			var rootParent = this._getRootParent(childCat)+ '';
			catList.push(childCat);
			if(rootParent){

				//Update filtered entries
				this.vFILTERED_CATEGORY_LIST.push(rootParent);
				//Remove root category from list
				this._removeFromCategoryList(rootParent);
			}
		}

		return categories.filter(function(ele){
			return catList.indexOf(ele) == -1 && this._getRootParent(ele) != "";
		});
	},

	/**
     * Validate if category contains accessible articles directly under it
     * @param String: kb_category sys_id
     * @param String: Encoded Query to run against knowledge articles
     * @return boolean: true if category has any direct accessible article under it 
     */
	hasDirectArticle: function(category, knowledgeQuery) {
		this.vKNOWLEDGE_QUERY = knowledgeQuery || this.vKNOWLEDGE_QUERY || new global.KBKnowledge().getKnowledgeEncodedQuery() || "";

		var kb = new GlideRecordSecure("kb_knowledge");
		kb.addQuery("kb_category", category);
		if (this.vKNOWLEDGE_QUERY)
			kb.addEncodedQuery(this.vKNOWLEDGE_QUERY);
		kb.setLimit(1);
		kb.query();
		if (kb.next())
			return true;

		return false;
	},

	_removeFromCategoryList: function(element) {
		this.vCATEGORIES_LIST = this.vCATEGORIES_LIST.filter(function(val) {
			return element != val;
		});
	},

	_getRootParent: function(category) {
		if (this.vCATEGORIES_LIST.indexOf(category) != -1)
			return category;

		var rootParent = "";
		var map = JSON.parse(this.vCATEGORY_CHILD_MAP);
		this.vCATEGORIES_LIST.forEach(function(val) {
			if (map[val + ''].indexOf(category) != -1){
				rootParent = val;
				return val;
			}
		});

		return rootParent;
	},

	setCategories: function(categories) {
		this.vCATEGORIES_LIST = categories;
	},

	type: "KBCategorySNC"
});
```