let currentUser = null;

// -------------------- Popup --------------------
function showPopup(msg,color="red"){
    let popup = document.getElementById("popup");
    if(!popup) return;
    popup.style.background = color;
    popup.innerText = msg;
    popup.style.display = "block";
    setTimeout(()=>{ popup.style.display="none"; },2500);
}

// -------------------- Auth --------------------
function login(username, password){
    fetch("backend.php?action=login", {
        method:"POST",
        body: new URLSearchParams({username,password})
    }).then(r=>r.json()).then(res=>{
        if(res.status=="success"){
            currentUser = {id:res.user_id, username:res.username, isAdmin:res.isAdmin};
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            showPopup("Login successful!","green");
            setTimeout(()=>{ window.location = res.isAdmin?"admin.html":"index.html"; },800);
        } else showPopup(res.message);
    });
}

function register(){
    let username = document.getElementById("reg-username").value.trim();
    let password = document.getElementById("reg-password").value.trim();
    fetch("backend.php?action=register",{
        method:"POST",
        body:new URLSearchParams({username,password})
    }).then(r=>r.json()).then(res=>{
        if(res.status=="success"){ 
            showPopup(res.message,"green"); 
            setTimeout(()=>window.location="login.html",1000); 
        } else showPopup(res.message);
    });
}

function logout(){
    localStorage.removeItem("currentUser");
    window.location="login.html";
}

// -------------------- Login enforcement --------------------
function enforceLogin(){
    let u = localStorage.getItem("currentUser");
    if(!u){ 
        showPopup("Please login first!","red"); 
        setTimeout(()=>window.location="login.html",800); 
        return;
    }
    currentUser = JSON.parse(u);
    let displayName=document.getElementById("username-display");
    if(displayName) displayName.innerText="Welcome, "+currentUser.username;
    if(currentUser.isAdmin){
        let adminBtn=document.getElementById("admin-btn");
        if(adminBtn) adminBtn.style.display="block";
    }
}

// -------------------- User List / Friend --------------------
function displayUserList(){
    fetch(`backend.php?action=getUsers&current_id=${currentUser.id}`)
    .then(r=>r.json())
    .then(users=>{
        let container=document.getElementById("user-list");
        if(!container) return;
        container.innerHTML="";
        users.forEach(u=>{
            let div=document.createElement("div");
            div.className="message-card";
            div.innerHTML=`<strong>${u.username}</strong>
                <button class="neon-btn" onclick="toggleFriend(${u.id})">${u.isFriend?"Friend":"Add Friend"}</button>
                <button class="neon-btn" onclick="startChat(${u.id})">Chat</button>`;
            container.appendChild(div);
        });
    });
}

function toggleFriend(friend_id){
    fetch("backend.php?action=toggleFriend",{
        method:"POST",
        body:new URLSearchParams({user_id:currentUser.id, friend_id})
    }).then(r=>r.json())
    .then(res=>{
        showPopup(res.status=="added"?"Friend added!":"Friend removed","green");
        displayUserList();
    });
}

// -------------------- Chat --------------------
function startChat(chat_id){
    localStorage.setItem("chatWith", chat_id);
    window.location="conversation.html";
}

function initConversation(){
    enforceLogin();
    let chatWith = localStorage.getItem("chatWith");
    if(!chatWith) return window.location="index.html";
    displayConversation(chatWith);
}

function displayConversation(chatWith){
    fetch(`backend.php?action=getMessages&user_id=${currentUser.id}&chat_id=${chatWith}`)
    .then(r=>r.json())
    .then(msgs=>{
        let container=document.getElementById("conversation-list");
        if(!container) return;
        container.innerHTML="";
        msgs.forEach(m=>{
            let div=document.createElement("div");
            div.className="message-card";
            div.innerHTML=`<strong>${m.sender}</strong>: ${m.message} <small>[${m.created_at}]</small>`;
            let delBtn=document.createElement("button");
            delBtn.className="neon-btn";
            delBtn.innerText="Delete";
            delBtn.onclick=()=>deleteMessage(m.id,chatWith);
            div.appendChild(delBtn);
            container.appendChild(div);
        });
    });
}

function sendChat(){
    let input=document.getElementById("chat-input");
    let msg=input.value.trim();
    if(!msg) return;
    let chatWith = localStorage.getItem("chatWith");
    fetch("backend.php?action=sendMessage",{
        method:"POST",
        body:new URLSearchParams({sender_id:currentUser.id,receiver_id:chatWith,message:msg})
    }).then(r=>r.json()).then(res=>{
        if(res.status=="success"){ input.value=""; displayConversation(chatWith); }
    });
}

function deleteMessage(msg_id,chatWith){
    fetch("backend.php?action=deleteMessage",{
        method:"POST",
        body:new URLSearchParams({msg_id})
    }).then(r=>r.json()).then(res=>{
        displayConversation(chatWith);
        showPopup("Message deleted","red");
    });
}

// -------------------- Contact Admin --------------------
function showContact(){ document.getElementById("contact-form").style.display="block"; }
function closeForm(id){ document.getElementById(id).style.display="none"; }

function sendMessage(){
    let subject=document.getElementById("contact-subject").value.trim();
    let message=document.getElementById("contact-message").value.trim();
    if(!subject || !message) return showPopup("Fill all fields!");
    fetch("backend.php?action=sendMessage",{
        method:"POST",
        body:new URLSearchParams({sender_id:currentUser.id, receiver_id:1, subject, message})
    }).then(r=>r.json()).then(res=>{
        if(res.status=="success"){ showPopup("Message sent!","green"); closeForm('contact-form'); }
    });
}

// -------------------- Admin --------------------
function goToAdmin(){ if(currentUser.isAdmin) window.location="admin.html"; else showPopup("Only admin can access!","red"); }
function goToPortfolio(){ window.location="index.html"; }

function displayAdmin(){
    fetch("backend.php?action=getAdminData")
    .then(r=>r.json())
    .then(data=>{
        // Users Table
        let usersTable=document.getElementById("admin-users-table");
        if(usersTable){
            usersTable.innerHTML=`<tr><th>Username</th><th>Registered At</th><th>Status</th><th>Actions</th></tr>`;
            data.users.forEach(u=>{
                if(u.username==="admin") return;
                let tr=document.createElement("tr");
                tr.innerHTML=`<td>${u.username}</td><td>${u.registered}</td><td>${u.blocked?"Blocked":"Active"}</td>
                    <td>
                        <button onclick="blockUser(${u.id})">Block/Unblock</button>
                        <button onclick="removeUser(${u.id})">Remove</button>
                        <button onclick="sendAdminMessage(${u.id})">Message</button>
                    </td>`;
                usersTable.appendChild(tr);
            });
        }
        // Messages Table
        let messagesTable=document.getElementById("admin-messages-table");
        if(messagesTable){
            messagesTable.innerHTML=`<tr><th>From</th><th>To</th><th>Time</th><th>Subject</th><th>Message</th><th>Action</th></tr>`;
            data.messages.forEach(m=>{
                let tr=document.createElement("tr");
                tr.innerHTML=`<td>${m.from}</td><td>${m.to}</td><td>${m.time}</td><td>${m.subject||""}</td><td>${m.message}</td>
                    <td>
                        <button onclick="adminReply(${m.from_id},'${m.time}')">Reply</button>
                        <button onclick="adminDeleteMessage(${m.id})">Delete</button>
                    </td>`;
                messagesTable.appendChild(tr);
            });
        }
    });
}

function blockUser(user_id){
    fetch("backend.php?action=blockUser",{
        method:"POST",
        body:new URLSearchParams({user_id})
    }).then(()=>{ displayAdmin(); showPopup("User status changed","green"); });
}

function removeUser(user_id){
    fetch("backend.php?action=removeUser",{
        method:"POST",
        body:new URLSearchParams({user_id})
    }).then(()=>{ displayAdmin(); showPopup("User removed","green"); });
}

function adminReply(user_id,time){
    let reply=prompt(`Reply to user?`);
    if(reply){
        fetch("backend.php?action=adminReply",{
            method:"POST",
            body:new URLSearchParams({user_id,message:reply})
        }).then(()=>{ displayAdmin(); showPopup("Reply sent","green"); });
    }
}

function adminDeleteMessage(msg_id){
    fetch("backend.php?action=adminDeleteMessage",{
        method:"POST",
        body:new URLSearchParams({msg_id})
    }).then(()=>{ displayAdmin(); showPopup("Message deleted","red"); });
}

function sendAdminMessage(user_id){
    let msg=prompt(`Send new message:`);
    if(msg){
        fetch("backend.php?action=sendAdminMessage",{
            method:"POST",
            body:new URLSearchParams({user_id,message:msg})
        }).then(()=>{ displayAdmin(); showPopup("Message sent","green"); });
    }
}
