import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  IconButton,
  SegmentedButtons,
  Portal,
  Modal,
  TextInput,
  Snackbar,
  useTheme,
  Divider,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  listPatientDocuments,
  uploadPatientDocument,
  deletePatientDocument,
  PatientDocument,
} from '../../src/api/documents';
import {
  listPatientConsents,
  grantPatientConsent,
  revokePatientConsent,
  PatientConsent,
} from '../../src/api/consents';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import { BrandLogo } from '../../src/components/BrandLogo';
import { useBrand } from '../../src/providers/AppConfigProvider';
import { API_URL } from '../../src/config';
import { palette } from '../../src/theme';

interface AttachedFile {
  uri: string;
  name: string;
  size?: number;
  mimeType: string;
  base64?: string;
  isImage: boolean;
}

export default function DocumentsScreen() {
  const theme = useTheme();
  const brand = useBrand();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'documents' | 'consents'>('documents');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Upload modal state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<
    'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'INSURANCE' | 'OTHER'
  >('PRESCRIPTION');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Queries
  const docsQuery = useQuery({
    queryKey: ['patient-documents'],
    queryFn: listPatientDocuments,
  });

  const consentsQuery = useQuery({
    queryKey: ['patient-consents'],
    queryFn: listPatientConsents,
  });

  const isRefreshing = docsQuery.isRefetching || consentsQuery.isRefetching;

  const onRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['patient-documents'] });
    void queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
  };

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: uploadPatientDocument,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient-documents'] });
      setUploadModalVisible(false);
      setDocTitle('');
      setAttachedFile(null);
      setSnackbarMessage('Medical document uploaded successfully.');
    },
    onError: (err: any) => {
      setSnackbarMessage(err?.response?.data?.message || 'Failed to upload document.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deletePatientDocument,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient-documents'] });
      setSnackbarMessage('Document removed from records.');
    },
    onError: (err: any) => {
      setSnackbarMessage(err?.response?.data?.message || 'Failed to delete document.');
    },
  });

  // Grant Consent Mutation
  const grantMutation = useMutation({
    mutationFn: grantPatientConsent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
      setSnackbarMessage('24-Hour Clinical Consent granted to Care Manager team.');
    },
    onError: (err: any) => {
      setSnackbarMessage(err?.response?.data?.message || 'Failed to grant consent.');
    },
  });

  // Revoke Consent Mutation
  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => revokePatientConsent(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient-consents'] });
      setSnackbarMessage('Clinical consent revoked. Documents are now protected.');
    },
    onError: (err: any) => {
      setSnackbarMessage(err?.response?.data?.message || 'Failed to revoke consent.');
    },
  });

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'PRANOVA requires camera access to photograph your medical prescriptions and diagnostic reports.'
        );
        return;
      }

      setIsProcessingFile(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `camera_capture_${Date.now()}.jpg`;
        setAttachedFile({
          uri: asset.uri,
          name: fileName,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
          base64: asset.base64 || undefined,
          isImage: true,
        });

        if (!docTitle.trim()) {
          const dateLabel = new Date().toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
          });
          const prefix =
            docCategory === 'PRESCRIPTION'
              ? 'Prescription'
              : docCategory === 'LAB_REPORT'
              ? 'Lab Report'
              : 'Medical Record';
          setDocTitle(`${prefix} · ${dateLabel}`);
        }
      }
    } catch (err: any) {
      setSnackbarMessage('Could not open camera.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      setIsProcessingFile(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        let base64Data: string | undefined = undefined;
        try {
          base64Data = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64',
          });
        } catch (readErr) {
          console.warn('[DOCS] Base64 extraction skipped:', readErr);
        }

        const isImage = (asset.mimeType || '').startsWith('image/');
        setAttachedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType:
            asset.mimeType ||
            (asset.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          base64: base64Data,
          isImage,
        });

        if (!docTitle.trim()) {
          const cleanName = asset.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          setDocTitle(cleanName);
        }
      }
    } catch (err: any) {
      setSnackbarMessage('Could not attach document.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleUploadSubmit = () => {
    if (!docTitle.trim()) {
      setSnackbarMessage('Please enter a document title.');
      return;
    }
    if (!attachedFile) {
      setSnackbarMessage('Please take a photo or attach a document file.');
      return;
    }
    uploadMutation.mutate({
      title: docTitle.trim(),
      category: docCategory,
      documentType: docCategory as any,
      mimeType: attachedFile.mimeType,
      fileSize: attachedFile.size || 1024 * 150,
      base64Data: attachedFile.base64,
      fileName: attachedFile.name,
      fileUrl: attachedFile.uri,
    });
  };

  const handleOpenDocument = (url?: string) => {
    if (!url) {
      Alert.alert('No Link', 'This medical document does not have a downloadable file URL.');
      return;
    }
    let fullUrl = url;
    if (url.startsWith('/')) {
      const base = API_URL.replace(/\/api\/v1\/?$/, '');
      fullUrl = `${base}${url}`;
    }
    Linking.openURL(fullUrl).catch(() => {
      Alert.alert('Unable to Open', 'Could not open the document URL on your device browser.');
    });
  };

  const activeConsent = consentsQuery.data?.find((c) => c.status === 'ACTIVE');

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'PRESCRIPTION':
        return 'pill';
      case 'LAB_REPORT':
        return 'test-tube';
      case 'DISCHARGE_SUMMARY':
        return 'hospital-building';
      case 'INSURANCE':
      case 'INSURANCE_POLICY':
        return 'shield-account';
      default:
        return 'file-document';
    }
  };

  return (
    <View style={styles.container}>
      {/* Sticky Branded Top Header with Safe Notch Inset */}
      <Surface
        style={[
          styles.stickyHeader,
          { paddingTop: insets.top > 0 ? insets.top + 8 : 16 },
        ]}
        elevation={2}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.brandContainer}>
            <BrandLogo size={36} />
            <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
              <Text style={styles.headerAppName} numberOfLines={1}>
                {brand.appName}
              </Text>
              <Text style={styles.headerVaultSubtitle} numberOfLines={1}>
                Medical Records & Vault
              </Text>
            </View>
          </View>
          <View style={styles.secureBadge}>
            <MaterialCommunityIcons name="shield-lock" size={14} color="#0f766e" />
            <Text style={styles.secureBadgeText}>HIPAA Secured</Text>
          </View>
        </View>
      </Surface>

      {/* Segment Selector */}
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'documents' | 'consents')}
          buttons={[
            {
              value: 'documents',
              label: 'Medical Records',
              icon: 'file-document-outline',
            },
            {
              value: 'consents',
              label: 'Care Consents',
              icon: 'shield-lock-outline',
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'documents' ? (
          <>
            {/* Action Bar */}
            <View style={styles.headerBar}>
              <View>
                <Text variant="titleMedium" style={styles.headingText}>
                  My Health Records
                </Text>
                <Text variant="bodySmall" style={styles.subheadingText}>
                  {docsQuery.isError
                    ? 'Records Offline'
                    : `${docsQuery.data?.length ?? 0} verified medical documents`}
                </Text>
              </View>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => {
                  setAttachedFile(null);
                  setDocTitle('');
                  setUploadModalVisible(true);
                }}
                style={styles.uploadBtn}
              >
                Upload
              </Button>
            </View>

            {/* Document List */}
            {docsQuery.isLoading ? (
              <Text style={styles.emptyText}>Loading clinical records...</Text>
            ) : docsQuery.isError ? (
              <NetworkErrorState
                title="Medical Vault Offline"
                message="Cannot retrieve your clinical documents. Check your connection and tap retry."
                onRetry={() => void docsQuery.refetch()}
              />
            ) : docsQuery.data?.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyCardContent}>
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={48}
                    color={palette.muted}
                  />
                  <Text variant="titleSmall" style={{ marginTop: 12, fontWeight: '700' }}>
                    No documents uploaded yet
                  </Text>
                  <Text variant="bodySmall" style={{ color: palette.muted, textAlign: 'center', marginTop: 4 }}>
                    Take photos of physical prescriptions or attach lab reports for your care team.
                  </Text>
                  <Button
                    mode="contained-tonal"
                    icon="camera-plus"
                    onPress={() => {
                      setAttachedFile(null);
                      setDocTitle('');
                      setUploadModalVisible(true);
                    }}
                    style={{ marginTop: 16 }}
                  >
                    Upload Document
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              docsQuery.data?.map((doc) => (
                <Card
                  key={doc.id}
                  style={styles.docCard}
                  onPress={() => handleOpenDocument(doc.fileUrl)}
                >
                  <Card.Content style={styles.docCardContent}>
                    <View style={styles.docIconBox}>
                      <MaterialCommunityIcons
                        name={getCategoryIcon(doc.category)}
                        size={26}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="titleSmall" style={{ fontWeight: '700' }} numberOfLines={1}>
                        {doc.title}
                      </Text>
                      <View style={styles.chipRow}>
                        <Chip style={styles.categoryChip} textStyle={{ fontSize: 10, fontWeight: '600' }}>
                          {doc.category.replace(/_/g, ' ')}
                        </Chip>
                        <Text variant="bodySmall" style={{ color: palette.muted, fontSize: 11 }}>
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <IconButton
                      icon="trash-can-outline"
                      size={20}
                      iconColor={palette.muted}
                      onPress={() => {
                        Alert.alert('Delete Document', 'Are you sure you want to remove this document?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(doc.id) },
                        ]);
                      }}
                    />
                  </Card.Content>
                </Card>
              ))
            )}
          </>
        ) : (
          <>
            {/* Consent Guard Management */}
            <Card style={styles.consentNoticeCard}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text variant="titleSmall" style={{ fontWeight: '700', marginLeft: 8 }}>
                    Consent Guard (DPDP & HIPAA Compliance)
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: palette.ink, lineHeight: 18 }}>
                  Field Care Managers cannot inspect your clinical files without explicit patient consent. You can grant time-limited 24-hour access during ongoing emergency or post-op care.
                </Text>
              </Card.Content>
            </Card>

            {/* Active Consent Card */}
            {consentsQuery.isError ? (
              <NetworkErrorState
                compact
                message="Unable to verify consent status. Tap retry."
                onRetry={() => void consentsQuery.refetch()}
              />
            ) : activeConsent ? (
              <Card style={styles.activeConsentCard}>
                <Card.Content>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.activeDot} />
                      <Text variant="titleMedium" style={{ fontWeight: '800', color: palette.success }}>
                        Consent Active
                      </Text>
                    </View>
                    <Chip style={{ backgroundColor: '#E5F4EC' }} textStyle={{ color: palette.success, fontSize: 11, fontWeight: '700' }}>
                      24h Window
                    </Chip>
                  </View>

                  <Divider style={{ marginVertical: 12 }} />

                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    Purpose: {activeConsent.purpose}
                  </Text>
                  <Text variant="bodySmall" style={{ color: palette.muted, marginTop: 4 }}>
                    Granted: {new Date(activeConsent.grantedAt).toLocaleString()}
                  </Text>
                  <Text variant="bodySmall" style={{ color: palette.muted, marginTop: 2 }}>
                    Expires: {new Date(activeConsent.expiresAt).toLocaleString()}
                  </Text>

                  <Button
                    mode="contained"
                    buttonColor={palette.error}
                    textColor="#ffffff"
                    icon="shield-remove"
                    style={{ marginTop: 16 }}
                    loading={revokeMutation.isPending}
                    onPress={() => revokeMutation.mutate({ id: activeConsent.id, reason: 'Revoked by patient via mobile app' })}
                  >
                    Revoke Access Immediately
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <Card style={styles.inactiveConsentCard}>
                <Card.Content>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="lock-alert" size={24} color={palette.warning} />
                    <Text variant="titleMedium" style={{ fontWeight: '800', marginLeft: 8, color: palette.warning }}>
                      No Active Consent
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: palette.muted, marginTop: 8, lineHeight: 18 }}>
                    Your clinical documents are currently locked. If you are interacting with a Care Manager or need remote review, grant a 24-hour access pass.
                  </Text>

                  <Button
                    mode="contained"
                    icon="shield-plus"
                    style={{ marginTop: 16 }}
                    loading={grantMutation.isPending}
                    onPress={() =>
                      grantMutation.mutate({
                        purpose: 'Emergency triage & post-op medication review',
                        scope: 'CLINICAL_DOCS_READ',
                        durationHours: 24,
                      })
                    }
                  >
                    Grant 24-Hour Care Team Pass
                  </Button>
                </Card.Content>
              </Card>
            )}

            {/* Historical Consents List */}
            <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: 20, marginBottom: 12 }}>
              Consent Audit History
            </Text>
            {consentsQuery.isLoading ? (
              <Text style={styles.emptyText}>Loading consent history...</Text>
            ) : consentsQuery.data?.length === 0 ? (
              <Text style={styles.emptyText}>No historical consent records.</Text>
            ) : (
              consentsQuery.data?.map((c) => (
                <Card key={c.id} style={styles.historyCard}>
                  <Card.Content style={{ paddingVertical: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {c.purpose}
                      </Text>
                      <Chip
                        style={{
                          backgroundColor:
                            c.status === 'ACTIVE'
                              ? '#E5F4EC'
                              : c.status === 'REVOKED'
                              ? '#FBEAE7'
                              : '#F4F7F8',
                        }}
                        textStyle={{
                          fontSize: 10,
                          fontWeight: '700',
                          color:
                            c.status === 'ACTIVE'
                              ? palette.success
                              : c.status === 'REVOKED'
                              ? palette.error
                              : palette.muted,
                        }}
                      >
                        {c.status}
                      </Chip>
                    </View>
                    <Text variant="bodySmall" style={{ color: palette.muted, fontSize: 11, marginTop: 4 }}>
                      {new Date(c.grantedAt).toLocaleDateString()} • {c.scope}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Upload Modal with Camera & Document Attachment Options */}
      <Portal>
        <Modal
          visible={uploadModalVisible}
          onDismiss={() => {
            if (!uploadMutation.isPending) {
              setUploadModalVisible(false);
              setAttachedFile(null);
            }
          }}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="file-document-plus" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                Upload Medical Record
              </Text>
            </View>
            <IconButton
              icon="close"
              size={20}
              onPress={() => {
                if (!uploadMutation.isPending) {
                  setUploadModalVisible(false);
                  setAttachedFile(null);
                }
              }}
            />
          </View>

          <Divider style={{ marginBottom: 16 }} />

          {/* Category Selector */}
          <Text variant="bodySmall" style={styles.formSectionLabel}>
            Document Category
          </Text>
          <SegmentedButtons
            value={docCategory}
            onValueChange={(v) => setDocCategory(v as any)}
            buttons={[
              { value: 'PRESCRIPTION', label: 'Rx' },
              { value: 'LAB_REPORT', label: 'Lab' },
              { value: 'DISCHARGE_SUMMARY', label: 'Summary' },
              { value: 'OTHER', label: 'Other' },
            ]}
            style={{ marginBottom: 14 }}
          />

          {/* Document Title */}
          <Text variant="bodySmall" style={styles.formSectionLabel}>
            Document Title
          </Text>
          <TextInput
            placeholder="e.g. Dr. Sharma Prescription"
            value={docTitle}
            onChangeText={setDocTitle}
            mode="outlined"
            style={{ marginBottom: 16, backgroundColor: '#ffffff' }}
          />

          {/* Real Attachment Options: Camera & File Picker */}
          <Text variant="bodySmall" style={styles.formSectionLabel}>
            Attach File or Photo
          </Text>

          {!attachedFile ? (
            <View style={styles.attachActionsRow}>
              <TouchableOpacity
                style={styles.attachBtnCard}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
                disabled={isProcessingFile}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: '#ecfdf5' }]}>
                  <MaterialCommunityIcons name="camera" size={24} color="#059669" />
                </View>
                <Text style={styles.attachBtnTitle}>Use Camera</Text>
                <Text style={styles.attachBtnSub}>Take prescription photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachBtnCard}
                onPress={handlePickDocument}
                activeOpacity={0.8}
                disabled={isProcessingFile}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: '#e0f2fe' }]}>
                  <MaterialCommunityIcons name="file-upload-outline" size={24} color="#0284c7" />
                </View>
                <Text style={styles.attachBtnTitle}>Attach File</Text>
                <Text style={styles.attachBtnSub}>PDF, JPG or PNG</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.attachedPreviewCard}>
              {attachedFile.isImage ? (
                <Image
                  source={{ uri: attachedFile.uri }}
                  style={styles.attachedThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.attachedPdfIconBox}>
                  <MaterialCommunityIcons name="file-pdf-box" size={32} color="#dc2626" />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: palette.ink }} numberOfLines={1}>
                  {attachedFile.name}
                </Text>
                <Text variant="bodySmall" style={{ color: palette.muted, marginTop: 2 }}>
                  {attachedFile.size ? `${(attachedFile.size / 1024).toFixed(1)} KB` : 'Verified attachment'} ·{' '}
                  {attachedFile.isImage ? 'Camera Photo' : 'PDF Document'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
                  <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>Ready for upload</Text>
                </View>
              </View>
              <IconButton
                icon="close-circle-outline"
                size={22}
                iconColor="#dc2626"
                onPress={() => setAttachedFile(null)}
              />
            </View>
          )}

          {isProcessingFile && (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.processingText}>Processing attached document...</Text>
            </View>
          )}

          <Divider style={{ marginVertical: 18 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              mode="text"
              onPress={() => {
                setUploadModalVisible(false);
                setAttachedFile(null);
              }}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={uploadMutation.isPending}
              disabled={uploadMutation.isPending || isProcessingFile || !attachedFile}
              onPress={handleUploadSubmit}
              icon="cloud-upload-outline"
            >
              Upload Document
            </Button>
          </View>
        </Modal>
      </Portal>

      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage(null)}
        duration={3500}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  stickyHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerAppName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerVaultSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  secureBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headingText: {
    fontWeight: '800',
    color: palette.ink,
  },
  subheadingText: {
    color: palette.muted,
  },
  uploadBtn: {
    borderRadius: 8,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    marginTop: 12,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: palette.muted,
    marginTop: 20,
  },
  docCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.line,
  },
  docCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E4F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    height: 22,
    backgroundColor: '#EEF2F4',
  },
  consentNoticeCard: {
    backgroundColor: '#E8EFF8',
    borderRadius: 12,
    marginBottom: 16,
  },
  activeConsentCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.success,
    marginBottom: 16,
  },
  inactiveConsentCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: 16,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.success,
    marginRight: 8,
  },
  historyCard: {
    backgroundColor: palette.surface,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.line,
  },
  modalContent: {
    backgroundColor: palette.surface,
    padding: 20,
    margin: 16,
    borderRadius: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formSectionLabel: {
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 6,
  },
  attachActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  attachBtnCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  attachBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  attachBtnSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  attachedPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#99f6e4',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  attachedThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  attachedPdfIconBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  processingText: {
    fontSize: 12,
    color: '#0f766e',
    fontWeight: '600',
  },
});
