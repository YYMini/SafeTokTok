import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type LinkedPerson = {
  id: string;
  name: string;
  age: number;
  relation: string;
};

type ProfileModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  onLogout?: () => void;
  onChangePhoto?: () => void;
  onDeletePerson?: (id: string) => void;
  profile?: {
    name: string;
    userId: string;
    email: string;
    phone: string;
    imageUri?: string;
    linkedPeople: LinkedPerson[];
  };
};

export default function ProfileModal({
  visible,
  onClose,
  onSave,
  onLogout,
  onChangePhoto,
  onDeletePerson,
  profile,
}: ProfileModalProps) {
  const data = profile ?? {
    name: "보호자",
    userId: "admin",
    email: "stt@naver.com",
    phone: "010-1234-5678",
    imageUri: "",
    linkedPeople: [
      { id: "1", name: "김민준", age: 7, relation: "자녀" },
      { id: "2", name: "이서윤", age: 5, relation: "자녀" },
    ],
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>내 프로필</Text>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileTop}>
              <View style={styles.avatarWrap}>
                {data.imageUri ? (
                  <Image source={{ uri: data.imageUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={64} color="#FFFFFF" />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={onChangePhoto}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>

              <Text style={styles.profileName}>{data.name}</Text>
            </View>

            <View style={styles.infoSection}>
              <InfoRow icon="key-outline" label="ID" value={data.userId} />
              <InfoRow icon="mail-outline" label="이메일" value={data.email} />
              <InfoRow icon="call-outline" label="연락처" value={data.phone} />
            </View>

            <View style={styles.linkedSection}>
              <View style={styles.linkedTitleRow}>
                <Ionicons name="person-outline" size={22} color="#6B7280" />
                <Text style={styles.linkedTitle}>
                  연결된 대상자 ({data.linkedPeople.length})
                </Text>
              </View>

              <View style={styles.linkedCard}>
                {data.linkedPeople.map((person, index) => (
                  <View key={person.id}>
                    <View style={styles.personRow}>
                      <View style={styles.personLeft}>
                        <View style={styles.personAvatar}>
                          <Ionicons name="happy-outline" size={26} color="#FFFFFF" />
                        </View>

                        <View>
                          <Text style={styles.personName}>{person.name}</Text>
                          <Text style={styles.personMeta}>
                            {person.age}세 · {person.relation}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => onDeletePerson?.(person.id)}
                      >
                        <Ionicons name="trash-outline" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {index !== data.linkedPeople.length - 1 && (
                      <View style={styles.personDivider} />
                    )}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.bottomBtnRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={onSave}>
                <Text style={styles.actionBtnText}>저장</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={onLogout}>
                <Text style={styles.actionBtnText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={24} color="#6B7280" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    overflow: "hidden",
  },

  header: {
    height: 92,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  closeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  body: {
    flex: 1,
  },

  bodyContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
  },

  profileTop: {
    alignItems: "center",
    marginBottom: 20,
  },

  avatarWrap: {
    position: "relative",
    marginBottom: 16,
  },

  avatarImage: {
    width: 144,
    height: 144,
    borderRadius: 72,
  },

  avatarFallback: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: "#5B8DEF",
    justifyContent: "center",
    alignItems: "center",
  },

  cameraBtn: {
    position: "absolute",
    right: 0,
    bottom: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  profileName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },

  infoSection: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 6,
  },

  infoRow: {
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },

  infoLabel: {
    fontSize: 17,
    color: "#6B7280",
    fontWeight: "700",
  },

  infoValue: {
    fontSize: 17,
    color: "#111827",
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },

  linkedSection: {
    marginTop: 24,
  },

  linkedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },

  linkedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4B5563",
  },

  linkedCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 12,
  },

  personLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  personAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
  },

  personName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  personMeta: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  deleteBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FDECEC",
    justifyContent: "center",
    alignItems: "center",
  },

  personDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 70,
  },

  bottomBtnRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 22,
  },

  actionBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  actionBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#374151",
  },
});