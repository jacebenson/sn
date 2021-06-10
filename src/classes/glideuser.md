---
id: glideuser
title: GlideUser
---

# What is GlideUser

`gs.getUser()` is used pretty heavily to control access and other things
in Servicenow. I go over all the methods and properties of those below.

-   [GlideUser -
    Scoped](https://docs.servicenow.com/bundle/jakarta-application-development/page/app-store/dev_portal/API_reference/glideUserScoped/concept/c_GlideUserScopedAPI.html)
-   [GlideUser -
    Global](https://docs.servicenow.com/bundle/jakarta-application-development/page/app-store/dev_portal/API_reference/GlideUser_global/concept/GUserAPI.html)
-   [SNCGuru User
    Cheatsheet](https://www.servicenowguru.com/scripting/user-object-cheat-sheet/)

| Method                | Scoped                    | Global                           |
|-----------------------|---------------------------|----------------------------------|
| getCompanyID          | [Scoped](#getcompanyid)   | [Global](#getcompanyid)          |
| getDisplayName        | [Scoped](#getdisplayname) | [Global](#getdisplayname)        |
| getEmail              | [Scoped](#getemail)       | [Global](#getemail)              |
| getFirstName          | [Scoped](#getfirstname)   | [Global](#getfirstname)          |
| getID                 | [Scoped](#getiD)          | [Global](#getiD)                 |
| getLastName           | [Scoped](#getlastname)    | [Global](#getlastname)           |
| getName               | [Scoped](#getname)        | [Global](#getname)               |
| getRoles              | [Scoped](#getroles)       | [Global](#getroles)              |
| getUserRoles          | [Scoped](#getuserroles)   | [Global](#getuserroles)          |
| hasRole               | [Scoped](#gs-hasrole)     | [Global](#gs-hasrole)            |
| isMemberOf            | [Scoped](#ismemberof)     | [Global](#ismemberof)            |
| getPreference         | [Scoped](#getpreference)  |                                  |
| savePreference        | [Scoped](#savepreference) |                                  |
| getDomainDisplayValue |                           | [Global](#getdomaindisplayvalue) |
| getManagerID          |                           | [Global](#getmanagerid)          |
| getMyGroups           |                           | [Global](#getmygroups)           |
| getLanguage           |                           | [Global](#getlanguage)           |
| getDepartmentID       |                           | [Global](#getdepartmentid)       |
| getLocation           |                           | [Global](#getLocation)           |
| getCompanyRecord      |                           | [Global](#getcompanyrecord)      |
| getDomainID           |                           | [Global](#getdomainid)           |

## Server

### getCompanyID

Returns the current user's company sys\_id.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getCompanyID());
```

### getDisplayName

Returns the current user's display name.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getDisplayName());
```

### getDomainDisplayValue

Returns the display value of the user's session domain.

Note: There is no workaround for scoped applications.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getDomainDisplayValue());
```

### getEmail

Returns the user's email address.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getEmail());
```

### getFirstName

Returns the user's first name.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getFirstName());
```

### getID

Gets the sys\_id of the current user.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getID());
```

### getLastName

Returns the user's last name.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getLastName());
```

### getName

Returns the user ID, or login name, of the current user.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getName());
```

### getPreference

Gets the specified user preference value for the current user.

```js
 var currentUser = gs.getUser();
 currentUser.savePreference(­'myPref','red');
 gs.info(currentUser.getPreference(­'myPref'));
```

### getRoles

Returns a list of roles that includes explicitly granted roles,
inherited roles, and roles acquired by group membership.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getRoles());
```

### getUserRoles

Returns the list of roles explicitly granted to the user.

Unlike the getRoles() method, this method does not return roles the user
inherits or roles acquired from group membership.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getUserRoles());
```

### gs hasRole

Determines if the current user has the specified role.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.hasRole('admin'));
```

### isMemberOf

Determines if the current user is a member of the specified group.

**NOTE: This only takes a text string of the name.**

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.isMemberOf('Capacity Mgmt'));
 
 // I prefer to use the sys_id's so here's an example of that instead;
 var changeManagementGroup = 'a715cd759f2002002920bde8132e7018';
 var userObj = gs.getUser();
 var sys_user_grmember = new GlideRecord('sys_user_grmember');
 sys_user_grmember.addQuery('user', userObj.getID());
 sys_user_grmember.addQuery('group',changeManagementGroup);
 sys_user_grmember.setLimit(1);
 sys_user_grmember.query();
 gs.print(sys_user_grmember.getEncodedQuery());
 var isMemberOfChangeManagement = sys_user_grmember.hasNext();
 gs.print('isMemberOfChangeManagement: ' + isMemberOfChangeManagement);
 if (isMemberOfChangeManagement) {
  return true;
 }
```

### savePreference

Saves a user preference value to the database.

```js
 var currentUser = gs.getUser();
 currentUser.savePreference('myPref','red');
 gs.info(currentUser.getPreference('myPref'));
```

### getMyGroups

Returns the list the user's groups.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getMyGroups());
```

### getUserByID

Returns the user object by the user's id.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getUserByID('admin'));
```

### getLanguage

Returns the user language.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getLanguage());
```

### getDeparmentID

Returns undefined.

```js
 var currentUser = gs.getUser();
 gs.print("this seems to fail: " + currentUser.getDeparmentID());
 var deptID = currentUser.getDepartmentID();
 gs.info("this seems to work: " + deptID);
```

### getLocation

Returns empty string regardless of the user's "location" value.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getLocation());
```

### getCompanyRecord

Returns GlideRecord to `core_company` record.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getCompanyRecord());
 gs.info(currentUser.getCompanyRecord().getTableName()); // core_company
```

### getDomainID

Returns domain id or null.

```js
 var currentUser = gs.getUser();
 gs.info(currentUser.getDomainID());
```
