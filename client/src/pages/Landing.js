import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { redirect } from '../utils/routerUtils';
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:5000/room'
});

function Landing({socket}) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [usernameForm, setUsernameForm] = useState(location.state ? location.state.playerName : '');
  const [roomIDForm, setRoomIDForm] = useState(params.roomID || '');
  
  useEffect(() => {
    socket.on('room-id-taken', () => {
      alert('room id taken');
    })
    socket.on('room-id-available', (data) => {
      client.post('/create-room', {
        roomID: data.roomID,
        hostName: data.playerName
      }).then(() => {
        console.log(`Created ${data.roomID}`);
      }).catch(err => {
        console.error('Error creating room', err);
      });
      redirect('waiting-room', navigate, 
        {state: {
          roomID: data.roomID,
          playerName: data.playerName,
          isHost: true,
        }}
      );
    })
    socket.on('room-does-not-exist', () => {
      alert('room does not exist');
    })
    socket.on('room-does-exist', (data) => {
      socket.emit('check-name', {
        roomID: data.roomID,
        playerName: data.playerName
      });
    })
    socket.on('name-taken', () => {
      alert('name taken');
    })
    socket.on('name-available', (data) => {
      client.patch('/join-room', {
        roomID: data.roomID,
        playerName: data.playerName
      }).then(() => {
        console.log(`Joined ${data.roomID}`);
      }).catch(err => {
        console.error('Error joining room', err);
      });
      redirect('waiting-room', navigate, 
        {state: {
          roomID: data.roomID,
          playerName: data.playerName,
          isHost: false,
        }}
      );
    })

    return () => {
      socket.removeAllListeners();
    }
  }, []);

  const onJoin = () => {
    socket.emit('does-room-exist', {
      roomID: roomIDForm,
      playerName: usernameForm,
      isCreating: false,
    })
  }

  const onCreate = () => {
    socket.emit('does-room-exist', {
      roomID: roomIDForm,
      playerName: usernameForm,
      isCreating: true,
    });
  }

  const handleUsernameChange = (event) => {
    event.preventDefault();
    setUsernameForm(event.target.value);
  }

  const handleRoomIDChange = (event) => {
    event.preventDefault();
    setRoomIDForm(event.target.value);
  }

  return (
    <div className="flex flex-col items-center justify-center bg-prussian font-rubikone text-center text-honeydew min-h-screen">
      <div className="text-9xl">Mispel</div>
      <div>
        <div className="text-3xl mt-6">Enter Your Username:<br/></div>
        <input value = {usernameForm} onChange = {handleUsernameChange} type="text" name="name" className="text-center text-3xl bg-gray-400 mt-2 w-[75%] h-12 rounded-md focus:outline-none"/><br/>
        <div className="text-3xl mt-6">Enter Room Name:<br/></div>
        <input value = {roomIDForm} onChange = {handleRoomIDChange} type="text" name="room" className="text-center text-3xl bg-gray-400 mt-2 w-[75%] h-12 rounded-md focus:outline-none"/>
      </div>
      <button disabled = {usernameForm === ''} onClick = {onJoin} className="bg-orange text-4xl py-2 px-10 mt-8 rounded-md hover:bg-red">Join Room</button>
      <br/>
      <button disabled = {usernameForm === ''} onClick = {onCreate} className="bg-orange text-4xl py-2 px-7 mt-2 rounded-md hover:bg-red">Create Room</button>
    </div>
  );
}
export default Landing;
