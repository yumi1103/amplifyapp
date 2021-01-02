import React, { useState, useEffect, useReducer } from 'react';
import './App.css';
import Amplify, { API, Auth, Storage, graphqlOperation } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import config from './aws-exports';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import { onCreateNote } from './graphql/subscriptions';
Amplify.configure(config);

const QUERY = 'QUERY';
const SUBSCRIPTION = 'SUBSCRIPTION';

const initialState = {
  todos: [],
};

const reducer = (state, action) => {
  switch (action.type) {
    case QUERY:
      return {...state, todos: action.todos};
    case SUBSCRIPTION:
      return {...state, todos:[...state.todos, action.todo]}
    default:
      return state;
  }
};

async function createNewTodo() {
  const todo = { name:  "Todo " + Math.floor(Math.random() * 10) };
  await API.graphql(graphqlOperation(createNoteMutation, { input: todo }));
}

function App() {
 const [state, dispatch] = useReducer(reducer, initialState);
 const [user, setUser] = useState(null);

 useEffect(() => {

  async function getUser(){
    const user = await Auth.currentUserInfo();
    setUser(user);
    return user
  }

  getUser();

  async function getData() {
    const listNotesData = await API.graphql(graphqlOperation(listNotes));
    dispatch({ type: QUERY, todos: listNotesData.data.listNotes.items });
  }

  getData();

  let subscription;
  getUser().then((user) => {
    subscription = API.graphql(graphqlOperation(onCreateNote, {owner: user.username})).subscribe({
      next: (eventData) => {
        const todo = eventData.value.data.onCreateNote;
        dispatch({ type: SUBSCRIPTION, todo });
      }
    });
  });
  return () => subscription.unsubscribe();
}, []);

  return (
   <div className="App">
     <h1>My Notes App</h1>
      <p>user: {user!= null && user.username}</p>
      <AmplifySignOut />
      <button onClick={createNewTodo}>Add Todo</button>
      <div>
        {state.todos.length > 0 ? 
          state.todos.map((todo) => <p key={todo.id}>{todo.name} ({todo.createdAt})</p>) :
          <p>Add some todos!</p> 
        }
      </div>
    </div>
  );
}

export default withAuthenticator(App);