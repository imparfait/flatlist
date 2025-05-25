import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Button, Pressable } from 'react-native';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => {
    const loadTodos = async () => {
      try {
        const saved = await AsyncStorage.getItem('todos');
        if (saved) {
          setTodos(JSON.parse(saved));
        } else {
          const response = await axios.get('https://dummyjson.com/todos');
          const updatedTodos = response.data.todos.map(todo => ({
            ...todo,
            localCompleted: todo.completed,
            priority: 'low',
            date: '2025-01-01',
            status: 'to-do',
          }));
          setTodos(updatedTodos);
        }
      } catch (error) {
        console.error('Loading error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTodos();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('todos', JSON.stringify(todos)).catch((e) =>
      console.error('Saving error:', e)
    );
  }, [todos]);

  const toggleCompleted = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id
        ? { ...todo, localCompleted: !todo.localCompleted, status: !todo.localCompleted ? 'done' : 'to-do' }
        : todo
    ));
  };

  const onSubmit = data => {
    const newTodo = {
      id: Date.now(), 
      todo: data.title,
      localCompleted: false,
      status: 'to-do',
      priority: data.priority,
      date: data.date
    };
    setTodos([newTodo, ...todos]);
    reset(); 
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
      <View style={styles.priorityContainer}>
        {['low', 'medium', 'high'].map((level) => (
          <Controller
            key={level}
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <Pressable
                onPress={() => onChange(level)}
                style={[
                  styles.priorityButton,
                  value === level && styles.selected,
                ]}
              >
                <Text style={styles.priorityText}>{level}</Text>
              </Pressable>
            )}
          />
        ))}
      </View>
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
    </View>
  );
}
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
   priorityText: {
    textTransform: 'capitalize',
  },
});
