<?php
header('Content-Type: application/json');

$mysqli = new mysqli("localhost","root","","portfoliochat");
if ($mysqli->connect_errno) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); exit(); }

$action = $_REQUEST['action'] ?? '';

switch($action){

    // --------------- REGISTER ----------------
    case "register":
        $username = $_POST['username'];
        $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
        $check = $mysqli->query("SELECT * FROM users WHERE username='$username'");
        if($check->num_rows>0){ echo json_encode(["status"=>"error","message"=>"Username exists!"]); exit();}
        $mysqli->query("INSERT INTO users(username,password,isAdmin,blocked,registered) VALUES('$username','$password',0,0,NOW())");
        echo json_encode(["status"=>"success","message"=>"Registered successfully!"]);
        break;

    // --------------- LOGIN ----------------
    case "login":
        $username = $_POST['username'];
        $password = $_POST['password'];
        $res = $mysqli->query("SELECT * FROM users WHERE username='$username'");
        if($res->num_rows==0){ echo json_encode(["status"=>"error","message"=>"Invalid credentials!"]); exit();}
        $user = $res->fetch_assoc();
        if(!password_verify($password,$user['password'])){ echo json_encode(["status"=>"error","message"=>"Invalid credentials!"]); exit();}
        if($user['blocked']){ echo json_encode(["status"=>"error","message"=>"You are blocked!"]); exit();}
        echo json_encode(["status"=>"success","isAdmin"=>boolval($user['isAdmin']), "user_id"=>$user['id'], "username"=>$user['username']]);
        break;

    // --------------- GET USERS ----------------
    case "getUsers":
        $current_id = $_GET['current_id'];
        $res = $mysqli->query("SELECT id, username, registered, blocked FROM users WHERE id!=$current_id");
        $users=[];
        while($row=$res->fetch_assoc()){
            $fid_res = $mysqli->query("SELECT * FROM friends WHERE (user_id=$current_id AND friend_id={$row['id']})");
            $isFriend = $fid_res->num_rows>0;
            $users[]=[
                "id"=>$row['id'],
                "username"=>$row['username'],
                "registered"=>$row['registered'],
                "status"=>$row['blocked']?"Blocked":"Active",
                "isFriend"=>$isFriend
            ];
        }
        echo json_encode($users);
        break;

    // --------------- FRIENDS ----------------
    case "toggleFriend":
        $user_id = $_POST['user_id'];
        $friend_id = $_POST['friend_id'];
        $check = $mysqli->query("SELECT * FROM friends WHERE user_id=$user_id AND friend_id=$friend_id");
        if($check->num_rows>0){
            $mysqli->query("DELETE FROM friends WHERE (user_id=$user_id AND friend_id=$friend_id) OR (user_id=$friend_id AND friend_id=$user_id)");
            echo json_encode(["status"=>"removed"]);
        }else{
            $mysqli->query("INSERT INTO friends(user_id, friend_id) VALUES($user_id,$friend_id),($friend_id,$user_id)");
            echo json_encode(["status"=>"added"]);
        }
        break;

    // --------------- SEND MESSAGE ----------------
    case "sendMessage":
        $sender_id = $_POST['sender_id'];
        $receiver_id = $_POST['receiver_id'];
        $message = $_POST['message'];
        $subject = $_POST['subject'] ?? null;
        $stmt = $mysqli->prepare("INSERT INTO messages(sender_id,receiver_id,subject,message,created_at) VALUES(?,?,?,?,NOW())");
        $stmt->bind_param("iiss",$sender_id,$receiver_id,$subject,$message);
        $stmt->execute();
        echo json_encode(["status"=>"success"]);
        break;

    // --------------- GET MESSAGES ----------------
    case "getMessages":
        $user_id = $_GET['user_id'];
        $chat_id = $_GET['chat_id'];
        $res = $mysqli->query("SELECT m.id, u1.username AS sender, u2.username AS receiver, m.subject, m.message, m.created_at
            FROM messages m
            JOIN users u1 ON m.sender_id=u1.id
            JOIN users u2 ON m.receiver_id=u2.id
            WHERE (m.sender_id=$user_id AND m.receiver_id=$chat_id) OR (m.sender_id=$chat_id AND m.receiver_id=$user_id)
            ORDER BY m.created_at ASC");
        $msgs=[];
        while($row=$res->fetch_assoc()){ $msgs[]=$row; }
        echo json_encode($msgs);
        break;

    // --------------- DELETE MESSAGE ----------------
    case "deleteMessage":
        $msg_id = $_POST['msg_id'];
        $mysqli->query("DELETE FROM messages WHERE id=$msg_id");
        echo json_encode(["status"=>"success"]);
        break;

    // --------------- ADMIN ----------------
    case "blockUser":
        $uid = $_GET['user_id'];
        $mysqli->query("UPDATE users SET blocked = NOT blocked WHERE id=$uid");
        echo json_encode(["status"=>"success"]);
        break;

    case "removeUser":
        $uid = $_GET['user_id'];
        $mysqli->query("DELETE FROM users WHERE id=$uid");
        echo json_encode(["status"=>"success"]);
        break;

    case "getAdminMessages":
        $res = $mysqli->query("SELECT m.id, u1.username AS sender, u2.username AS receiver, m.subject, m.message, m.created_at
            FROM messages m
            JOIN users u1 ON m.sender_id=u1.id
            JOIN users u2 ON m.receiver_id=u2.id
            WHERE u1.isAdmin=1 OR u2.isAdmin=1 ORDER BY m.created_at DESC");
        $msgs=[];
        while($row=$res->fetch_assoc()){ $msgs[]=$row; }
        echo json_encode($msgs);
        break;

    default:
        echo json_encode(["status"=>"error","message"=>"Invalid action"]);
}
?>
