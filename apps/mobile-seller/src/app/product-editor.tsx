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
import { uploadMedia } from '../lib/storage';
import { CATEGORY_TREE } from '../lib/categories';
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
  Sparkles,
  Palette,
  CheckCircle2,
} from 'lucide-react-native';

const STUDIO_BACKGROUNDS = [
  { name: 'Standard', color: '#EEF2FF', border: '#C7D2FE' },
  { name: 'Blanc Pur', color: '#FFFFFF', border: '#E2E8F0' },
  { name: 'Gris Studio', color: '#F1F5F9', border: '#CBD5E1' },
  { name: 'Rose Doux', color: '#FDF2F8', border: '#FBCFE8' },
  { name: 'Bleu Ciel', color: '#EFF6FF', border: '#BFDBFE' },
  { name: 'Ambre Chaud', color: '#FFFBEB', border: '#FDE68A' },
];

export default function ProductEditorScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 14);

  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.id as string | undefined;

  const { shop, user } = useAuth();

  const [title, setTitle] = useState('');
  const [selectedParentCat, setSelectedParentCat] = useState<string>('femme');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('vetements-femmes');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedBgColor, setSelectedBgColor] = useState<string>('#EEF2FF');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const activeParent = CATEGORY_TREE.find(c => c.id === selectedParentCat) || CATEGORY_TREE[0];

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
        
        // Find corresponding category
        const savedCat = data.category || 'vetements-femmes';
        let foundParent = 'femme';
        for (const p of CATEGORY_TREE) {
          if (p.id === savedCat || p.subCategories.some(s => s.id === savedCat)) {
            foundParent = p.id;
            break;
          }
        }
        setSelectedParentCat(foundParent);
        setSelectedSubCat(savedCat);

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
      Alert.alert('Permission requise', "Veuillez autoriser l'accès à vos photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleParentCatChange = (parentId: string) => {
    setSelectedParentCat(parentId);
    const parent = CATEGORY_TREE.find(p => p.id === parentId);
    if (parent && parent.subCategories.length > 0) {
      setSelectedSubCat(parent.subCategories[0].id);
    } else {
      setSelectedSubCat(parentId);
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
            category: selectedSubCat,
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
            category: selectedSubCat,
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

      // Handle product image saving & uploading to Supabase Storage
      if (currentProductId && imageUri) {
        let finalImageUrl = imageUri;
        
        // If it's a local file, upload it to Supabase Storage
        if (!imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
          const uploadedUrl = await uploadMedia(imageUri, `prod_${currentProductId}`);
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
          }
        }

        // Upsert into product_media
        await supabase.from('product_media').upsert({
          product_id: currentProductId,
          url: finalImageUrl,
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
          {/* Image Studio Container */}
          <Text style={styles.label}>Photo & Studio de l'article</Text>
          <View style={[styles.studioBox, { backgroundColor: selectedBgColor }]}>
            <TouchableOpacity style={styles.imagePickerBox} onPress={handlePickImage} activeOpacity={0.8}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Upload size={32} color="#4F46E5" />
                  <Text style={styles.imagePlaceholderText}>Ajouter une photo du produit</Text>
                  <Text style={styles.imagePlaceholderSubText}>PNG, JPG ou WEBP acceptés</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Studio Background Selector */}
            <View style={styles.studioBgSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Palette size={14} color="#64748B" />
                <Text style={styles.studioSubLabel}>Fond Studio Kalagban :</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {STUDIO_BACKGROUNDS.map((bg) => (
                  <TouchableOpacity
                    key={bg.name}
                    style={[
                      styles.bgPill,
                      { backgroundColor: bg.color, borderColor: bg.border },
                      selectedBgColor === bg.color && styles.activeBgPill,
                    ]}
                    onPress={() => setSelectedBgColor(bg.color)}
                  >
                    <Text style={[styles.bgPillText, selectedBgColor === bg.color && { fontWeight: '800', color: '#4F46E5' }]}>
                      {bg.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Form Fields Card */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titre du Produit *</Text>
              <View style={styles.inputWrapper}>
                <Tag size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: T-Shirt Pendyra, Robe Wax, iPhone 15..."
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            {/* Rayon / Parent Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>1. Rayon Principal *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsRow}>
                {CATEGORY_TREE.map(parent => (
                  <TouchableOpacity
                    key={parent.id}
                    style={[styles.catChip, selectedParentCat === parent.id && styles.activeCatChip]}
                    onPress={() => handleParentCatChange(parent.id)}
                  >
                    <Text style={[styles.catChipText, selectedParentCat === parent.id && styles.activeCatChipText]}>
                      {parent.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sub-Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>2. Sous-catégorie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsRow}>
                {activeParent.subCategories.map(sub => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.subCatChip, selectedSubCat === sub.id && styles.activeSubCatChip]}
                    onPress={() => setSelectedSubCat(sub.id)}
                  >
                    <Text style={[styles.subCatChipText, selectedSubCat === sub.id && styles.activeSubCatChipText]}>
                      {sub.label}
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
                placeholder="Décrivez les caractéristiques de votre produit (matière, tailles, couleurs, garantie)..."
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
  studioBox: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  imagePickerBox: {
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
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
  studioBgSection: {
    marginTop: 12,
  },
  studioSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  bgPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeBgPill: {
    borderColor: '#4F46E5',
    borderWidth: 2,
  },
  bgPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
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
  subCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  activeSubCatChip: {
    backgroundColor: '#3730A3',
    borderColor: '#3730A3',
  },
  subCatChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  activeSubCatChipText: {
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
