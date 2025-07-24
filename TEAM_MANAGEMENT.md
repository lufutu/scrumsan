Team Management
===============

The Team Management page shows all users that have been added to the Organization. These users can be employees in your company or just members of your team. This page has three tabs: Members, Guests and Permission sets.

The Members tab is organized as a table with the following columns:

-   Team Member's name,
-   Roles and Labels
-   Engagements and
-   Time Off Activities

![Team Management page screenshot](https://vs-uploads-production.nyc3.cdn.digitaloceanspaces.com/uploads/blog/imagelZwb8QYnny.jpg)

There are *four types of default permissions* a user can have within an Organization and an unlimited number of custom permissions:

-   Owner (also called Admin, but the permission can't be changed for this user by other Team Members)
-   Admin
-   Member (default member permission that can be edited)
-   Guest

The Guest permission can't be assigned. Users have the Guest permission when they are added as Team Members to any Board that belongs to the Organization. Team Members of the Organization can see all Guests on the Guests tab on the Team Management page. Guests can't access the Team Management page.

Admins can add new Team Members to the Organization. Admins can access all available pages within an Organization:

-   Boards,
-   Projects,
-   Invoicing,
-   Clients,
-   Team Management and
-   Configuration.\
Organization Members (the default permission) and other custom permissions can't access the Organization Configuration page.

All members that have been added to an Organization can leave it by clicking on the red button in the upper right corner of the screen.

Removing a Team Member from an Organization will not remove that member from the Boards within the Organization he/she belongs to. The Admin who is removing a Team Member from the Organization can select the Boards from which he/she wants to remove a Team Member. The Organization Admin needs to have the Admin or Owner permission on a Board in order to be able to select it.

Team Member's Profile Card
--------------------------

When a Team Member is added to an Organization, the Organization members can access the Team Member's profile card which contains various information by clicking on the desired Team Member from the table. The Organization Owner and Admins can edit the information.

The card contains:

-   Name
-   Email
-   Phone
-   Total working hours per week
-   Permission
-   Role
-   Five tabs:
    -   Profile - contains additional info
    -   Timeline
    -   Time off
    -   Engagements
    -   Boards

![Team member's profile card screenshot](https://vs-uploads-production.nyc3.cdn.digitaloceanspaces.com/uploads/blog/imageHBy5efH5A6.png)

### Role

The purpose of the Role field is to define the role (job position) of a Team Member within a Project. There are no predefined roles. Once you create a role, it can be used for multiple Team Members. A role can be easily created by clicking on the "Tag plus" icon and typing the role name. You can choose the color for that role also. When you have set the desired name and color, click on the check icon. Examples of roles within a Project: developer, tester, designer, Product Owner, etc.

### Profile tab

The Profile tab lets you (if you are the Organization Owner or an Admin within the Organization) add additional info about a particular Team Member. VivifyScrum gives you the opportunity to add:

-   2nd email address
-   Address
-   Phone
-   Linkedin
-   Skype
-   Twitter
-   Birthday
-   Marital status
-   Family
-   Other

You can set who can see the additional info you add - whether the info will be visible to Admins or Members.

### Timeline

The Timeline tab lets you add any important events related to a Team Member. You need to write the name and the date of that event.

### Time off

This is a tab where you'll add (and later find) the dates when a Team Member is not available to work. From the drop-down menu, you can choose between:

-   Vacation
-   Parental leave
-   Sick leave
-   Paid time off
-   Unpaid time off
-   Other

After choosing the type of absence, click on the calendar icon below the drop-down menu to choose the period of absence. Click on the Add button to save the time-off. The Time off tab offers you the ability to set up a unique number of vacation days for each member of the organization, including setting up the date when a user joined the company and overriding calculated days for each user in any given year. More on setting up the vacation tracker in your Organization can be found on the [Organization Configuration page](https://www.vivifyscrum.com/how-it-works/organizations/configuration "Organization Configuration").

Engagements
-----------

The Engagements tab is where you can add the hours a Team Member spends working on a Project per week. Clicking on the green Add Engagement button in the upper right corner of the Engagements tab will open a new modal for adding new engagement.

1.  First of all, you should select a [Project](https://www.vivifyscrum.com/how-it-works/projects/projects) from the drop-down list. If you still haven't added a Project, you can do it directly from this drop-down by choosing the Add new Project option.
2.  Define how many hours per week a Team Member works on the selected Project.
3.  Select a role the Team Member has on the Project.
4.  Choose the start and the end date of the engagement (available shortcuts for setting the engagement from the project start date to the project end date).

![Team member's engagements screenshot](https://vs-uploads-production.nyc3.cdn.digitaloceanspaces.com/uploads/blog/imagegPaqZtbSB8.png)

To delete or update the engagement, simply click on the engagement you want to delete or edit and click on the appropriate button.

The tab also gives you the insight into past engagements on Projects and the number of hours per week a Team Member is available.

Boards
------

The Boards tab shows the active Boards a Team Member belongs to within the Organization. From this tab, you can directly add a Team Member to a Board within the Organization on which you have the required permission (Owner or Admin).

Filter
------

Team Management page also offers the Filter feature. You can filter your view by:

-   Roles
-   Projects
-   Total hours
-   Availability hours

When filtering by total and availability hours, you can set a custom interval. Total hours are the hours a Team Member works per week. By entering a Team Member's engagements on projects, his/her availability will decrease. By using the availability hours filter option, you can find which Team Member is available to work on a new project.

You can save the most frequently used filters.

![Availability filter screenshot](https://vs-uploads-production.nyc3.cdn.digitaloceanspaces.com/uploads/blog/imagejwf1wggsTm.png)


Permission Sets
===============

On the Team management page, it is possible to create permission sets. You can create a custom permission set for members of your Organization or in an Organization where you have Admin permissions. Choose which pages a member will have access to. You can also set which kind of actions that user will be able to perform on those pages.

To create a permission set go to the third tab on the Team Management page and click on the button in the upper right corner - Create permission set. You will need to define the name and choose preferred permissions. Here is the list of available options:

-   Team Members:

    -   View all members - a member will be able to see all members in the Organization
    -   Manage all members - a member will be able to add new members to your Organization, to assign permissions and to delete a member from the Organization

*Note: If a member doesn't have a permission to access projects, the engagements of a team member will not be visible.*

-   Projects page:

    -   View all projects - a member can view all projects within the Organization
    -   Manage all projects - a member can view and manage all projects within the Organization
    -   View permission for assigned projects - a member can view all projects on which he/she is engaged (has a past or active engagement)
    -   Manage permission for assigned projects - a member can view, edit and archive projects on which he/she is engaged (has a past or active engagement)

*Note: If a member doesn't have a permission to view team members, the engagements will not be visible for any project. If a member has a permission to (at least) view members and a permission to manage assigned or all projects, editing engagements will be available.*

-   Invoicing page:

    -   View all invoices - a member can view all invoices created in the Organization
    -   Manage all invoices - a member with this permission can view, edit and create new invoices
    -   View permission for assigned projects - a member can view invoices created for projects this member is involved in
    -   Manage permission for assigned projects - a member can view and manage all invoices created for projects this member is involved in, but can't create new ones

*Note: If a member has a permission to manage all invoices but without any permissions regarding the Clients page, a member can create a new invoice but he/she will not be able to fill the Clients field.*

-   Clients page:

    -   View all clients - a member can see Client cards with available information but he/she doesn't have a permission to open and edit the cards
    -   Manage all clients - a member can open, edit, delete and add new clients to the Organization. *A member can add new clients only with this permission*
    -   View permission for assigned projects - a member can see Clients linked to the projects he/she is involved in 
    -   Manage permission for assigned projects - a member can see and update Clients linked to the projects he/she is involved in

*Note: If a member doesn't have a permission to view projects in the Organization, the Projects tab will be unavailable on the clients' cards (even though a member has a permission to view, edit and add clients).*

-   Worklogs page:

    -   Manage all - a member can create reports based on the selected worklogs. Invoices can only be created by this member if he/she has a permission to manage all invoices

![Custom permission set](https://vs-uploads-production.nyc3.cdn.digitaloceanspaces.com/uploads/blog/imagejErunVOD3f.png)

Once you've finished selecting preferred permissions, click the Save button. The newly created permission set will now be available on the drop-down list on the Members tab.

You can create an unlimited number of custom permission sets. Each set can be edited or deleted (except the Admin permission). If you choose to delete a permission set that has already been assigned to a certain member of your organization, you will be prompted to choose a new permission set from the available ones.

Roles
Roles in VivifyScrum are different privileges you can assign to your Team Members on a Board. After you’ve created a Kanban or a Scrum Board you’ll want to gather your Team. You can do it by clicking on ‘Team Members’ in the sidebar. Just click the + button. If your future Team Member is already a VivifyScrum user, you can type their name in the provided field and the user will be added to your Board. In the latter case, if you choose a user who is not a member of VivifyScrum, you should type their email address in the provided field. After the invited user accepts your invitation (an invitation will be sent via email) and joins VivifyScrum, he/she will be added to your Board.

There are five different roles in VivifyScrum. Team Members can perform tasks depending on permissions granted by their roles. The roles in VivifyScrum are:

Read: The member has access to the Board but doesn't have the permission to edit it. Items can be assigned to a Read member. He/she can't configure the Board nor the Team.
Read & Comment: The difference from the Read member is that a member with this privilege can make comments on Items.
Write: The member can access the Board and edit its content (add or delete Items and columns, start or finish a Sprint etc.). The configuration of the Board and the configuration of the Team are not privileges of this member.
Admin: The member can access, edit and configure the Board. Admin can also configure the Team (add or remove members and assign roles).
Owner: The Owner has full access to the Board. Only the Owner has the privilege to archive or delete a Board. There can be only one Owner per Board. The number of other roles per Board is unlimited.
scrum roles and team members