import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import {
  Package,
  X,
  Upload,
  Check,
  Tag,
  DollarSign,
  Layers,
  FileText,
  Trash2,
} from 'lucide-react-native';

export default function ProductEditorScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 14);

  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.id as string | undefined;

  const { shop, user } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Mode');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const categories = ['Mode', 'Électronique', 'Maison', 'Beauté & Santé', 'Accessoires'];

  useEffect(() => {
    if (productId) {
      fetchExistingProduct(productId);
    }
  }, [productId]);

  const fetchExistingProduct = async (id: string) => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_media(url)')
        .eq('id', id)
        .single();

      if (!error && data) {
        setTitle(data.title || '');
        setCategory(data.category || 'Mode');
        setPrice(data.price ? String(data.price) : '');
        setOldPrice(data.old_price ? String(data.old_price) : '');
        setStockQuantity(data.stock_quantity ? String(data.stock_quantity) : '10');
        setDescription(data.description || '');

        if (data.product_media?.[0]?.url) {
          setImageUri(data.product_media[0].url);
        }
      }
    } catch (err) {
      console.error('Error fetching product detail:', err);
    } finally {
      setFetching(false);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !price.trim() || !stockQuantity.trim()) {
      Alert.alert('Champs obligatoires', 'Veuillez remplir le titre, le prix et la quantité en stock.');
      return;
    }

    setLoading(true);

    try {
      const targetShopId = shop?.id || user?.id;
      if (!targetShopId) {
        Alert.alert('Erreur', 'Identifiant de boutique introuvable.');
        return;
      }

      let currentProductId = productId;

      if (productId) {
        // Update existing product
        await supabase
          .from('products')
          .update({
            title: title.trim(),
            category: category,
            price: parseFloat(price),
            old_price: oldPrice ? parseFloat(oldPrice) : null,
            stock_quantity: parseInt(stockQuantity, 10),
            description: description.trim(),
          })
          .eq('id', productId);
      } else {
        // Insert new product
        const { data: newProd, error: insertErr } = await supabase
          .from('products')
          .insert({
            shop_id: targetShopId,
            title: title.trim(),
            category: category,
            price: parseFloat(price),
            old_price: oldPrice ? parseFloat(oldPrice) : null,
            stock_quantity: parseInt(stockQuantity, 10),
            description: description.trim(),
            status: 'active',
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        if (newProd) {
          currentProductId = newProd.id;
        }
      }

      // Handle product image saving
      if (currentProductId && imageUri) {
        // Insert into product_media
        await supabase.from('product_media').upsert({
          product_id: currentProductId,
          url: imageUri,
          position: 0,
        });
      }

      Alert.alert(
        'Succès ! 🎉',
        productId ? 'Produit mis à jour avec succès.' : 'Votre nouveau produit a été publié dans votre boutique.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error('Error saving product:', err);
      Alert.alert('Erreur', err.message || 'Impossible d\'enregistrer le produit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Modal Header */}
      <View style={[styles.modalHeader, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>
          {productId ? 'Modifier le Produit' : 'Ajouter un Produit'}
        </Text>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Publier</Text>
          )}
        </TouchableOpacity>
      </View>

      {fetching ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + bottomPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Picker */}
          <Text style={styles.label}>Photo de l'article</Text>
          <TouchableOpacity style={styles.imagePickerBox} onPress={handlePickImage} activeOpacity={0.8}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Upload size={32} color="#4F46E5" />
                <Text style={styles.imagePlaceholderText}>Ajouter une photo du produit</Text>
                <Text style={styles.imagePlaceholderSubText}>PNG, JPG ou WEBP acceptés</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form Fields Card */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titre du Produit *</Text>
              <View style={styles.inputWrapper}>
                <Tag size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: T-Shirt Pendyra, iPhone 15 Pro Max..."
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Catégorie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsRow}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, category === cat && styles.activeCatChip]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.catChipText, category === cat && styles.activeCatChipText]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Prix Vente (FCFA) *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 12 }]}
                    placeholder="15000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ancien Prix (Barré)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 12 }]}
                    placeholder="20000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={oldPrice}
                    onChangeText={setOldPrice}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantité en Stock *</Text>
              <View style={styles.inputWrapper}>
                <Layers size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description du Produit</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez les caractéristiques de votre produit (couleurs, tailles, garantie)..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  imagePickerBox: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imagePlaceholderText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '800',
  },
  imagePlaceholderSubText: {
    color: '#64748B',
    fontSize: 11,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  catChipsRow: {
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  activeCatChip: {
    backgroundColor: '#4F46E5',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeCatChipText: {
    color: '#FFFFFF',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
  },
});
