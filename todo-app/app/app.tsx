import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Button, Pressable, Platform } from 'react-native';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import * as SQLite from 'expo-sqlite';
import {  useDispatch,useSelector  } from 'react-redux';
import { setIncompleteCount } from './todoSlice';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export default function Main() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = SQLite.openDatabaseSync('todo.db');
  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      title: '',
      date: '',
      priority: 'low',
    },
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const setup = async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          date TEXT,
          priority TEXT,
          status TEXT,
          completed INTEGER
        );
      `);
      const rows = await db.getAllAsync('SELECT * FROM todos');
      const todosFromDb = rows.map(row => ({
        id: row.id,
        todo: row.title,
        date: row.date,
        priority: row.priority,
        status: row.status,
        localCompleted: row.completed === 1,
      }));
      setTodos(todosFromDb);
      dispatch(setIncompleteCount(todosFromDb.filter(t => !t.localCompleted).length));
      registerForPushNotificationsAsync();
      setLoading(false);
    };
    setup();
  }, []);
  useEffect(() => {
     Notifications.setNotificationCategoryAsync('deadlineActions', [
        {
          identifier: 'show',
          buttonTitle: 'Show',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'delete',
          buttonTitle: 'Delete',
          destructive: true,
        },
    ]);
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const action = response.actionIdentifier;
      const data = response.notification.request.content.data;
      if (action === 'show') {
        console.log('User chose to view task:', data.id);
      } else if (action === 'delete') {
        deleteTodoById(data.id);
      }
    });
    return () => subscription.remove();
  }, []);

  const deleteTodoById = async (id) => {
      await db.runAsync(`DELETE FROM todos WHERE id = ?`, id);
      const updated = todos.filter(t => t.id !== id);
      setTodos(updated);
      dispatch(setIncompleteCount(updated.filter(t => !t.localCompleted).length));
    };
    
  const onSubmit = async (data) => {
    try {
      const newTodo = {
        title: data.title,
        date: data.date,
        priority: data.priority,
        status: 'to-do',
        completed: 0,
      };
      const result = await db.runAsync(
        `INSERT INTO todos (title, date, priority, status, completed) VALUES (?, ?, ?, ?, ?)`,
        newTodo.title,
        newTodo.date,
        newTodo.priority,
        newTodo.status,
        newTodo.completed
      );
      const insertedTodo = {
        id: result.lastInsertRowId,
        todo: newTodo.title,
        date: newTodo.date,
        priority: newTodo.priority,
        status: newTodo.status,
        localCompleted: false,
      };
      const updatedTodos = [insertedTodo, ...todos];
      setTodos(updatedTodos);
      await scheduleNotification(insertedTodo);
      dispatch(setIncompleteCount(updatedTodos.filter(t => !t.localCompleted).length));
      reset(); 
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const toggleCompleted = async (id) => {
    const todo = todos.find(t => t.id === id);
    const newCompleted = !todo.localCompleted;
    await db.runAsync(
      'UPDATE todos SET completed = ?, status = ? WHERE id = ?',
      newCompleted ? 1 : 0,
      newCompleted ? 'done' : 'to-do',
      id
    );
    const updatedTodos = todos.map(t =>
        t.id === id
          ? { ...t, localCompleted: newCompleted, status: newCompleted ? 'done' : 'to-do' }
          : t
      );
      setTodos(updatedTodos);
      dispatch(setIncompleteCount(updatedTodos.filter(t => !t.localCompleted).length)); 
 };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => toggleCompleted(item.id)}>
      <View style={[styles.item, item.localCompleted && styles.completedItem]}>
        <View>
          <Text style={[styles.title, item.localCompleted && styles.completedText]}>
            {item.todo}
          </Text>
          <Text style={styles.meta}>Priority: {item.priority} | Due: {item.date}</Text>
        </View>
        <Text style={styles.time}>{item.localCompleted ? '✓' : '⏳'}</Text>
      </View>
    </TouchableOpacity>
  );

  const BottomMenu = () => {
    const incompleteCount = useSelector(state => state.todo.incompleteCount);
    return (
        <View style={styles.bottomMenu}>
          <Text style={styles.menuItem}>🏠 Home</Text>
          <View style={styles.menuItem}>
            <Text>🔔</Text>
            {incompleteCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {incompleteCount > 99 ? '99+' : incompleteCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.menuItem}>⚙ Settings</Text>
        </View>
    );
  };

  const registerForPushNotificationsAsync = async () => {
     let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for notifications!');
      return;
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return token;
  };

  const convertToNotificationDate = (dateStr) => {
    return new Date(`${dateStr}T09:00:00`);
  };

  const scheduleNotification = async (todo) => {
    const trigger = convertToNotificationDate(todo.date);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Deadline today!',
        body: `Your task "${todo.title}" is due today.`,
        data: { id: todo.id },
        categoryIdentifier: 'deadlineActions',
      },
      trigger,
    });
    return id;
  };

  return (
    <View style={styles.container}>
        <Text style={styles.header}>TODO List</Text>
        <View style={styles.form}>
          <Controller
            control={control}
            name="title"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Task Title"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <Text style={styles.label}>Priority</Text>
          <Controller
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <View style={styles.priorityContainer}>
                {['low', 'medium', 'high'].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => onChange(level)}
                    style={[
                      styles.priorityButton,
                      value === level && styles.selected,
                    ]}
                  >
                    <Text style={styles.priorityText}>{level}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
          <Button title="Add Task" onPress={handleSubmit(onSubmit)} />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <FlatList
            data={todos}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
          />
        )}
        <BottomMenu />
      </View> 
  );}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  date: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  item: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    marginVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  completedItem: {
    backgroundColor: '#d1ffd6',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  meta: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  time: {
    fontSize: 18,
  },
    priorityContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  priorityButton: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  selected: {
    backgroundColor: '#add8e6',
  },
   priorityText: {
    textTransform: 'capitalize',
  },
  bottomMenu: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  paddingVertical: 10,
  borderTopWidth: 1,
  borderTopColor: '#ccc',
  backgroundColor: '#fff',
},
menuItem: {
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
},
badge: {
  position: 'absolute',
  top: -5,
  right: -10,
  backgroundColor: 'red',
  borderRadius: 12,
  paddingHorizontal: 5,
  paddingVertical: 2,
},
badgeText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: 'bold',
},
});