import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// File server API (optional - only for creating real projects)
let FileServer;
try {
  FileServer = require('./src/api/fileServer').FileServer;
} catch (e) {
  console.warn('FileServer not available:', e);
}

export default function App() {
  const [mode, setMode] = useState('menu'); // 'menu', 'create', 'editor'
  const [projectName, setProjectName] = useState('MyGame');
  const [projectPath, setProjectPath] = useState('');
  const [currentProject, setCurrentProject] = useState(null);

  const handleCreateProject = async () => {
    try {
      if (!projectName.trim()) {
        Alert.alert('Error', 'Please enter a project name');
        return;
      }

      if (!projectPath.trim()) {
        Alert.alert('Error', 'Please enter a project location');
        return;
      }

      const fullPath = `${projectPath}\\${projectName}`;
      
      Alert.alert(
        'Project Creation',
        `Project will be created at:\n${fullPath}\n\nMake sure the file server is running!`,
        [
          {
            text: 'Create',
            onPress: async () => {
              try {
                // Check if server is running
                try {
                  await FileServer.checkHealth();
                } catch (error) {
                  Alert.alert(
                    'Server Not Running',
                    'The file server is not running. Please start it first:\n\ncd server\nnpm install\nnpm start',
                    [{ text: 'OK' }]
                  );
                  return;
                }

                // Create project using file server
                const result = await FileServer.createProject(projectPath, projectName);
                
                Alert.alert('Success', result.message || 'Project created successfully!');
                
                // Open editor
                const project = {
                  id: `proj_${Date.now()}`,
                  name: projectName,
                  path: fullPath,
                  scene: {
                    name: 'Main Scene',
                    width: 800,
                    height: 600,
                    backgroundColor: '#2a2a2a',
                    objects: [],
                  },
                };
                setCurrentProject(project);
                setMode('editor');
              } catch (error) {
                Alert.alert('Error', `Failed to create project: ${error.message}`);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleQuickStart = () => {
    const project = {
      id: `proj_${Date.now()}`,
      name: projectName,
      path: projectName.toLowerCase().replace(/\s+/g, '-'),
      scene: {
        name: 'Main Scene',
        width: 800,
        height: 600,
        backgroundColor: '#2a2a2a',
        objects: [],
      },
    };
    setCurrentProject(project);
    setMode('editor');
  };

  // Menu Mode - Project Manager
  if (mode === 'menu') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎮 ReGame Engine Editor</Text>
          <Text style={styles.subtitle}>React Native Edition</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Create New Project Card */}
          <View style={styles.card}>
            <Text style={styles.cardIcon}>📁</Text>
            <Text style={styles.cardTitle}>Create New Project</Text>
            <Text style={styles.cardDesc}>Set up a new game project with ReGame Engine</Text>
            
            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary]} 
              onPress={() => setMode('create')}
            >
              <Text style={styles.buttonText}>Create Project</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Start Card */}
          <View style={styles.card}>
            <Text style={styles.cardIcon}>⚡</Text>
            <Text style={styles.cardTitle}>Quick Start</Text>
            <Text style={styles.cardDesc}>Jump into the editor without saving files</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Project Name"
              placeholderTextColor="#666"
              value={projectName}
              onChangeText={setProjectName}
            />
            
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={handleQuickStart}
            >
              <Text style={styles.buttonText}>Open Editor</Text>
            </TouchableOpacity>
          </View>

          {/* Coming Soon */}
          <View style={styles.card}>
            <Text style={styles.cardIcon}>📂</Text>
            <Text style={styles.cardTitle}>Recent Projects</Text>
            <Text style={styles.cardDesc}>Coming Soon: Browse your recent game projects</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Create Mode - Project Creator
  if (mode === 'create') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('menu')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create New Project</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.form}>
            <Text style={styles.label}>Project Name</Text>
            <TextInput
              style={styles.input}
              placeholder="MyAwesomeGame"
              placeholderTextColor="#666"
              value={projectName}
              onChangeText={setProjectName}
            />

            <Text style={styles.label}>Project Location</Text>
            <TextInput
              style={styles.input}
              placeholder="/path/to/your/projects"
              placeholderTextColor="#666"
              value={projectPath}
              onChangeText={setProjectPath}
            />

            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary, styles.buttonLarge]} 
              onPress={handleCreateProject}
            >
              <Text style={styles.buttonText}>Create Project</Text>
            </TouchableOpacity>

            <Text style={styles.helpText}>
              This will create a new folder with the ReGame Engine starter template
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Editor Mode - Main Editor Interface
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => setMode('menu')}>
          <Text style={styles.toolbarButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>{currentProject?.name || 'Editor'}</Text>
        <TouchableOpacity>
          <Text style={styles.toolbarButton}>▶️</Text>
        </TouchableOpacity>
      </View>

      {/* Editor Layout */}
      <View style={styles.editorLayout}>
        {/* Left: Hierarchy */}
        <View style={styles.hierarchy}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Hierarchy</Text>
          </View>
          <ScrollView style={styles.panelContent}>
            <Text style={styles.emptyState}>No objects yet</Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add Object</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Center: Scene View */}
        <View style={styles.sceneView}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Scene</Text>
          </View>
          <View style={styles.sceneCanvas}>
            <Text style={styles.canvasText}>🎨 Scene Canvas</Text>
            <Text style={styles.canvasHelp}>Drag objects here to build your game</Text>
          </View>
        </View>

        {/* Right: Inspector */}
        <View style={styles.inspector}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Inspector</Text>
          </View>
          <ScrollView style={styles.panelContent}>
            <Text style={styles.emptyState}>Select an object to edit</Text>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  backButton: {
    fontSize: 18,
    color: '#e94560',
    marginBottom: 10,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPrimary: {
    backgroundColor: '#e94560',
  },
  buttonSecondary: {
    backgroundColor: '#0f3460',
  },
  buttonLarge: {
    paddingVertical: 18,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  form: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  toolbarButton: {
    fontSize: 24,
    color: '#fff',
    paddingHorizontal: 12,
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  editorLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  hierarchy: {
    width: 200,
    backgroundColor: '#16213e',
    borderRightWidth: 1,
    borderRightColor: '#0f3460',
  },
  sceneView: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  inspector: {
    width: 250,
    backgroundColor: '#16213e',
    borderLeftWidth: 1,
    borderLeftColor: '#0f3460',
  },
  panelHeader: {
    padding: 12,
    backgroundColor: '#0f3460',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },
  panelContent: {
    flex: 1,
    padding: 12,
  },
  emptyState: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  addButton: {
    backgroundColor: '#0f3460',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sceneCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  canvasText: {
    fontSize: 32,
    color: '#666',
    marginBottom: 8,
  },
  canvasHelp: {
    fontSize: 14,
    color: '#444',
  },
});


