import React from "react";

function Users({ title, question }) {
    return (
        <div className="user-cont">
            <div className="user-header">
                <div>User Management</div>
                <div className="user-buttons-cont">
                    <button className="user-export-button">Export</button>
                    <button className="user-add-button">Add User</button>
                </div>
            </div>

            <div className="user-list-cont">
                Full user management interface with filters, search, and bulk actions...
            </div>
        </div>
    )
}

export default Users;